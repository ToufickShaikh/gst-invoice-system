const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const pdfGenerator = require('../utils/pdfGenerator');
const { calculateTotals } = require('../utils/taxHelpers');
const { v4: uuidv4 } = require('uuid');
const { generateUpiQr } = require('../utils/upiHelper');
const fs = require('fs');
const path = require('path');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// Helper function to generate sequential invoice numbers
async function generateInvoiceNumber(customerType) {
    try {
        // Get the highest invoice number for this customer type
        const lastInvoice = await Invoice.findOne({
            invoiceNumber: { $regex: `^${customerType}-` }
        }).sort({ invoiceNumber: -1 });

        let nextNumber = 1;

        if (lastInvoice) {
            // Extract the number part from the invoice number (e.g., "B2B-05" -> 5)
            const match = lastInvoice.invoiceNumber.match(new RegExp(`^${customerType}-(\d+)$`));
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        // Format with leading zeros (e.g., 01, 02, 03...)
        const formattedNumber = nextNumber.toString().padStart(2, '0');
        return `${customerType}-${formattedNumber}`;
    } catch (error) {
        console.error('[ERROR] Failed to generate invoice number:', error);
        // Fallback to UUID-based number if sequential generation fails
        return `${customerType}-${uuidv4().slice(0, 8)}`;
    }
}

// @desc    Get all invoices, optionally filtered by billingType
// @route   GET /api/billing/invoices
// @access  Private
const getInvoices = async (req, res) => {
    console.log('Fetching invoices with query:', req.query);
    try {
        const { billingType } = req.query;
        let query = {};

        if (billingType && ['B2B', 'B2C'].includes(billingType.toUpperCase())) {
            console.log(`Filtering invoices for billing type: ${billingType.toUpperCase()}`);

            // Find customers with the specified customerType
            const customers = await Customer.find({ customerType: billingType.toUpperCase() });
            const customerIds = customers.map(c => c._id);

            // Filter invoices by customer IDs
            query.customer = { $in: customerIds };
        } else {
            console.log('No valid billingType filter applied - returning all invoices.');
        }

        const invoices = await Invoice.find(query).populate('customer').sort({ createdAt: -1 });
        console.log(`Found ${invoices.length} invoices.`);

        // Log invoices without customers for debugging
        const invoicesWithoutCustomers = invoices.filter(inv => !inv.customer);
        if (invoicesWithoutCustomers.length > 0) {
            console.log(`⚠ Found ${invoicesWithoutCustomers.length} invoices without customers:`,
                invoicesWithoutCustomers.map(inv => inv.invoiceNumber));
        }

        res.json(invoices);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to get invoices', error);
    }
};

// @desc    Get invoice by ID
// @route   GET /api/billing/invoices/:id
// @access  Private
const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('customer')
            .populate('items.item');

        if (!invoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        res.json(invoice);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to get invoice', error);
    }
};

// @desc    Create a new invoice
// @route   POST /api/billing/invoices
// @access  Private
const createInvoice = async (req, res) => {
    console.log('--- Starting Invoice Creation ---');
    const { customer, items, discount = 0, shippingCharges = 0, paidAmount = 0, paymentMethod = '', billingType = '' } = req.body;

    // Input validation
    if (!customer || !items || items.length === 0) {
        return sendErrorResponse(res, 400, 'Customer and at least one item are required');
    }

    try {
        // Ensure customer data is populated for tax calculation
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            return sendErrorResponse(res, 400, 'Customer not found');
        }

        // Validate items and check stock availability
        for (const invoiceItem of items) {
            if (!invoiceItem.item || !invoiceItem.quantity || invoiceItem.rate === undefined) {
                return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and rate');
            }
            if (invoiceItem.quantity <= 0) {
                return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
            }
            if (invoiceItem.rate < 0) {
                return sendErrorResponse(res, 400, 'Rate cannot be negative');
            }

            const item = await Item.findById(invoiceItem.item);
            if (!item) {
                return sendErrorResponse(res, 404, `Item with ID ${invoiceItem.item} not found`);
            }
            if (item.quantityInStock < invoiceItem.quantity) {
                return sendErrorResponse(res, 400, `Insufficient stock for ${item.name}. Available: ${item.quantityInStock}, Requested: ${invoiceItem.quantity}`);
            }
        }

        // Recalculate totals on the backend to ensure data integrity
        const { subTotal, taxAmount, totalAmount: grandTotal } = calculateTotals(items, customerDetails.state);
        const balance = grandTotal - paidAmount;
        const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);

        // Generate sequential invoice number based on customer type
        const customerType = customerDetails.customerType;
        const invoiceNumber = await generateInvoiceNumber(customerType);

        const invoice = new Invoice({
            invoiceNumber,
            customer,
            items,
            subTotal,
            cgst: taxAmount.cgst,
            sgst: taxAmount.sgst,
            igst: taxAmount.igst,
            totalTax,
            grandTotal,
            discount,
            shippingCharges,
            paidAmount,
            balance,
            paymentMethod,
            billingType,
            totalAmount: grandTotal,
        });

        await invoice.save();

        // Decrement stock quantities after successful save
        for (const invoiceItem of items) {
            await Item.findByIdAndUpdate(invoiceItem.item, {
                $inc: { quantityInStock: -invoiceItem.quantity },
            });
        }

        // Optionally, generate PDF and return its path
        let pdfPath = null;
        try {
            pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
            invoice.pdfPath = pdfPath;
            await invoice.save();
        } catch (e) {
            console.error('PDF generation failed during creation:', e);
            // Do not block invoice creation if PDF fails
        }

        res.status(201).json(invoice);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to create invoice', error);
    }
};

// @desc    Update an existing invoice by ID
// @route   PUT /api/billing/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { customer, items, discount = 0, shippingCharges = 0, paidAmount = 0, paymentMethod = '', billingType = '' } = req.body;

    // Input validation
    if (!customer || !items || items.length === 0) {
        return sendErrorResponse(res, 400, 'Customer and at least one item are required');
    }

    try {
        const originalInvoice = await Invoice.findById(id);
        if (!originalInvoice) {
            return sendErrorResponse(res, 404, 'Original invoice not found for update');
        }

        // Revert stock for original items
        for (const originalItem of originalInvoice.items) {
            await Item.findByIdAndUpdate(originalItem.item, {
                $inc: { quantityInStock: originalItem.quantity },
            });
        }

        // Ensure customer data is populated for tax calculation
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            return sendErrorResponse(res, 400, 'Customer for invoice not found');
        }

        // Validate items and check stock availability for new items
        for (const updatedItem of items) {
            if (!updatedItem.item || !updatedItem.quantity || updatedItem.rate === undefined) {
                return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and rate');
            }
            if (updatedItem.quantity <= 0) {
                return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
            }
            if (updatedItem.rate < 0) {
                return sendErrorResponse(res, 400, 'Rate cannot be negative');
            }

            const item = await Item.findById(updatedItem.item);
            if (!item) {
                return sendErrorResponse(res, 404, `Item with ID ${updatedItem.item} not found`);
            }
            if (item.quantityInStock < updatedItem.quantity) {
                // Revert changes made so far before sending error
                for (const revertItem of items) {
                    if (revertItem.item.toString() !== updatedItem.item.toString()) {
                        await Item.findByIdAndUpdate(revertItem.item, {
                            $inc: { quantityInStock: revertItem.quantity },
                        });
                    }
                }
                return sendErrorResponse(res, 400, `Insufficient stock for ${item.name}. Available: ${item.quantityInStock}, Requested: ${updatedItem.quantity}`);
            }
        }

        // Recalculate totals based on updated items
        const { subTotal, taxAmount, totalAmount: grandTotal } = calculateTotals(items, customerDetails.state);
        const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
        const balance = grandTotal - paidAmount;

        const updatedInvoice = await Invoice.findByIdAndUpdate(id, {
            customer,
            items,
            subTotal,
            cgst: taxAmount.cgst,
            sgst: taxAmount.sgst,
            igst: taxAmount.igst,
            totalTax,
            grandTotal,
            discount,
            shippingCharges,
            paidAmount,
            balance,
            paymentMethod,
            billingType,
            totalAmount: grandTotal,
        }, { new: true, runValidators: true })
            .populate('customer')
            .populate('items.item');

        if (!updatedInvoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        // Decrement stock for updated items
        for (const updatedItem of items) {
            await Item.findByIdAndUpdate(updatedItem.item, {
                $inc: { quantityInStock: -updatedItem.quantity },
            });
        }

        // After successful update, regenerate the PDF
        let pdfPath = null;
        try {
            pdfPath = await pdfGenerator.generateInvoicePDF(updatedInvoice);
            updatedInvoice.pdfPath = pdfPath;
            await updatedInvoice.save();
        } catch (e) {
            console.error(`[WARN] PDF regeneration failed for invoice ${id}:`, e);
        }

        res.json(updatedInvoice);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to update invoice', error);
    }
};

// @desc    Delete an invoice by ID
// @route   DELETE /api/billing/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await Invoice.findById(id);

        if (!invoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        // Revert stock changes
        for (const invoiceItem of invoice.items) {
            await Item.findByIdAndUpdate(invoiceItem.item, {
                $inc: { quantityInStock: invoiceItem.quantity },
            });
        }

        // Delete associated PDF file if it exists
        if (invoice.pdfPath) {
            const fullPath = path.join(__dirname, '../invoices', path.basename(invoice.pdfPath));
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`[INFO] Deleted PDF file: ${fullPath}`);
            }
        }

        await invoice.deleteOne();

        res.json({ message: 'Invoice removed successfully' });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to delete invoice', error);
    }
};

// Regenerate PDF for an existing invoice
const reprintInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await Invoice.findById(invoiceId).populate('customer').populate('items.item');

        if (!invoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        // If grandTotal is 0 or null, it's likely a legacy invoice. Let's recalculate.
        const currentTotal = invoice.grandTotal || invoice.totalAmount || 0;
        if (!currentTotal || currentTotal <= 0) {
            console.warn(`[WARN] Reprinting legacy invoice ${invoiceId} with invalid grandTotal. Attempting to recalculate.`);

            if (!invoice.customer) {
                return sendErrorResponse(res, 400, 'Cannot recalculate for reprint: Customer data is missing.');
            }
            if (!invoice.items || invoice.items.length === 0 || invoice.items.some(i => !i.item)) {
                return sendErrorResponse(res, 400, 'Cannot recalculate for reprint: Item data is missing or not fully populated.');
            }

            // Recalculate totals
            const populatedItemsForRecalc = invoice.items.map(i => {
                const itemData = i.item.toObject ? i.item.toObject() : i.item;
                return { ...itemData, quantity: i.quantity };
            });

            const { subTotal, taxAmount, totalAmount: newGrandTotal } = calculateTotals(
                populatedItemsForRecalc,
                invoice.customer.state
            );
            const newTotalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
            const newBalance = newGrandTotal - (invoice.paidAmount || 0);

            // Update the invoice in the DB to fix legacy data
            invoice.subTotal = subTotal;
            invoice.cgst = taxAmount.cgst;
            invoice.sgst = taxAmount.sgst;
            invoice.igst = taxAmount.igst;
            invoice.totalTax = newTotalTax;
            invoice.grandTotal = newGrandTotal;
            invoice.balance = newBalance;
            invoice.totalAmount = newGrandTotal;

            await invoice.save();
        }

        const pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
        invoice.pdfPath = pdfPath;
        await invoice.save();

        res.json({ pdfPath, message: 'Invoice reprinted successfully' });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to generate PDF', error);
    }
};

// Dashboard stats endpoint
const getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let dateQuery = {};
        if (startDate) {
            dateQuery.createdAt = { ...dateQuery.createdAt, $gte: new Date(startDate) };
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999); // Set to the end of the day
            dateQuery.createdAt = { ...dateQuery.createdAt, $lte: end };
        }

        const totalInvoices = await Invoice.countDocuments(dateQuery);
        const totalCustomers = await Customer.countDocuments();

        const invoiceData = await Invoice.aggregate([
            { $match: dateQuery },
            {   
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$grandTotal' },
                    totalPaid: { $sum: '$paidAmount' },
                },
            },
        ]);

        const stats = {
            totalInvoices,
            totalCustomers,
            totalRevenue: invoiceData[0]?.totalRevenue || 0,
            totalPaid: invoiceData[0]?.totalPaid || 0,
            balanceDue: (invoiceData[0]?.totalRevenue || 0) - (invoiceData[0]?.totalPaid || 0),
        };
        res.json(stats);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to fetch dashboard stats', error);
    }
};

/**
 * @desc    Generate QR code for payment
 * @route   GET /api/billing/invoices/:id/payment-qr
 * @access  Private
 */
const generatePaymentQr = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await Invoice.findById(invoiceId)
            .populate('customer')
            .populate('items.item');

        if (!invoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        let grandTotal = invoice.grandTotal || 0;
        let paidAmount = invoice.paidAmount || 0;
        let balance = grandTotal - paidAmount;

        // If grandTotal is 0, it's likely a legacy invoice. Let's recalculate.
        if (grandTotal <= 0) {
            if (!invoice.customer) {
                return sendErrorResponse(res, 400, 'Cannot recalculate: Customer data is missing.');
            }
            if (!invoice.items || invoice.items.length === 0 || invoice.items.some(i => !i.item)) {
                return sendErrorResponse(res, 400, 'Cannot recalculate: Item data is missing or not fully populated.');
            }

            const populatedItemsForRecalc = invoice.items.map(i => {
                const itemData = i.item.toObject ? i.item.toObject() : i.item;
                return { ...itemData, quantity: i.quantity };
            });

            const { subTotal, taxAmount, totalAmount: newGrandTotal } = calculateTotals(
                populatedItemsForRecalc,
                invoice.customer.state
            );
            const newTotalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
            const newBalance = newGrandTotal - paidAmount;

            invoice.subTotal = subTotal;
            invoice.cgst = taxAmount.cgst;
            invoice.sgst = taxAmount.sgst;
            invoice.igst = taxAmount.igst;
            invoice.totalTax = newTotalTax;
            invoice.grandTotal = newGrandTotal;
            invoice.balance = newBalance;
            invoice.totalAmount = newGrandTotal;

            await invoice.save();

            grandTotal = newGrandTotal;
            balance = newBalance;
        }

        if (balance <= 0) {
            return sendErrorResponse(res, 400, 'Invoice is already fully paid');
        }

        const upiId = process.env.UPI_ID || 'shaikhtool@ibl';
        const { qrCodeImage } = await generateUpiQr(upiId, balance.toFixed(2));

        res.json({ qrCodeImage });

    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to generate QR code', error);
    }
};

// @desc    Generate PDF for public sharing (no auth required)
// @route   GET /api/billing/public/pdf/:invoiceId
// @access  Public
const generatePublicPdf = async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await Invoice.findById(invoiceId)
            .populate('customer')
            .populate('items.item');

        if (!invoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        const tempFileName = `public-invoice-${invoiceId}-${Date.now()}.pdf`;
        const pdfPath = await pdfGenerator.generateInvoicePDF(invoice, tempFileName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.sendFile(pdfPath, (err) => {
            if (err) {
                console.error('Error sending PDF file:', err);
                if (!res.headersSent) {
                    sendErrorResponse(res, 500, 'Error sending PDF file', err);
                }
            }

            setTimeout(() => {
                try {
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                } catch (deleteError) {
                    console.error('Error deleting temporary PDF:', deleteError);
                }
            }, 60000); // 1 minute = 60,000 milliseconds
        });

    } catch (error) {
        sendErrorResponse(res, 500, 'Public PDF generation failed', error);
    }
};

module.exports = {
    createInvoice,
    updateInvoice,
    reprintInvoice,
    getDashboardStats,
    generatePaymentQr,
    getInvoices,
    getInvoiceById,
    deleteInvoice,
    generatePublicPdf,
};