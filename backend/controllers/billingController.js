const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const pdfGenerator = require('../utils/pdfGenerator');
const { calculateTotals } = require('../utils/taxHelpers');
const { v4: uuidv4 } = require('uuid');
const { generateUpiQr } = require('../utils/upiHelper'); // Import UPI QR generator

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
            const match = lastInvoice.invoiceNumber.match(new RegExp(`^${customerType}-(\\d+)$`));
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
        console.error('[ERROR] Failed to get invoices:', error);
        res.status(500).json({ message: 'Failed to get invoices', error: error.message });
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
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Create a new invoice
// @route   POST /api/billing/invoices
// @access  Private
const createInvoice = async (req, res) => {
    console.log('--- Starting Invoice Creation ---');
    try {
        const {
            customer,
            items,
            discount = 0,
            shippingCharges = 0,
            paidAmount = 0,
            paymentMethod = '',
            billingType = ''
        } = req.body;

        console.log('[1/5] Received data for new invoice:', JSON.stringify(req.body, null, 2));

        // Ensure customer data is populated for tax calculation
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            console.error('[ERROR] Customer not found for ID:', customer);
            return res.status(400).json({ message: 'Customer not found' });
        }

        // Recalculate totals on the backend to ensure data integrity
        console.log('[2/5] Calculating totals based on items...');
        const { subTotal, taxAmount, totalAmount: grandTotal } = calculateTotals(items, customerDetails.state);
        const balance = grandTotal - paidAmount;
        const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
        console.log('[2/5] Totals calculated:', { subTotal, taxAmount, totalTax, grandTotal, balance });

        // Generate sequential invoice number based on customer type
        console.log('[3/5] Generating invoice number...');
        const customerType = customerDetails.customerType;
        const invoiceNumber = await generateInvoiceNumber(customerType);
        console.log(`[3/5] Generated invoice number: ${invoiceNumber}`);

        // Check stock availability and decrement
        for (const invoiceItem of items) {
            const item = await Item.findById(invoiceItem.item);
            if (!item) {
                return res.status(404).json({ message: `Item with ID ${invoiceItem.item} not found` });
            }
            if (item.quantityInStock < invoiceItem.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${item.name}. Available: ${item.quantityInStock}, Requested: ${invoiceItem.quantity}` });
            }
        }

        const invoice = new Invoice({
            invoiceNumber,
            customer,
            items,
            subTotal, // Use calculated subTotal
            cgst: taxAmount.cgst,
            sgst: taxAmount.sgst,
            igst: taxAmount.igst,
            totalTax, // Use calculated totalTax
            grandTotal, // Use calculated grandTotal
            discount,
            shippingCharges,
            paidAmount,
            balance,
            paymentMethod,
            billingType,
            totalAmount: grandTotal, // For reporting consistency
        });

        console.log('[4/5] Saving new invoice to database...');
        await invoice.save();
        console.log('[4/5] Invoice saved successfully.');

        // Decrement stock quantities after successful save
        for (const invoiceItem of items) {
            await Item.findByIdAndUpdate(invoiceItem.item, {
                $inc: { quantityInStock: -invoiceItem.quantity },
            });
        }

        // Optionally, generate PDF and return its path
        let pdfPath = null;
        try {
            console.log('[4/4] Generating PDF...');
            pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
            invoice.pdfPath = pdfPath;
            await invoice.save();
            console.log('[4/4] PDF generated at:', pdfPath);
        } catch (e) {
            console.error('PDF generation failed during creation:', e);
        }

        console.log('--- Invoice Creation Finished ---');
        res.status(201).json(invoice);
    } catch (error) {
        console.error('--- [ERROR] Invoice Creation Failed ---', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Update an existing invoice by ID
// @desc    Update an invoice
// @route   PUT /api/billing/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
    console.log('--- Starting Invoice Update Process ---');
    try {
        const { id } = req.params;
        const updatedData = req.body;
        console.log(`[1/6] Received request to update invoice ${id}`);
        console.log('[2/6] Request body:', JSON.stringify(updatedData, null, 2));

        // Fetch the original invoice to revert stock changes
        const originalInvoice = await Invoice.findById(id);
        if (!originalInvoice) {
            return res.status(404).json({ message: 'Original invoice not found for update' });
        }

        // Revert stock for original items
        for (const originalItem of originalInvoice.items) {
            await Item.findByIdAndUpdate(originalItem.item, {
                $inc: { quantityInStock: originalItem.quantity },
            });
        }

        // Ensure items have all necessary data for recalculation
        console.log('[3/6] Populating item data for recalculation...');
        const populatedItems = await Promise.all(
            updatedData.items.map(async (item) => {
                // The item object from the frontend might just have item._id and quantity
                if (item.rate && item.quantity && item.name) {
                    return item; // Item has what we need
                }
                // If data is missing, fetch the full item details from DB
                const itemDetails = await Item.findById(item.item || item._id);
                if (!itemDetails) {
                    // Throw an error if an item ID is invalid
                    throw new Error(`Item with ID ${item.item || item._id} not found.`);
                }
                return {
                    item: itemDetails._id,
                    name: itemDetails.name,
                    rate: itemDetails.rate,
                    quantity: item.quantity, // Quantity from the frontend
                };
            })
        );
        console.log('[3/6] Item data populated successfully.');

        updatedData.items = populatedItems;

        // Check stock availability for new items and decrement
        for (const updatedItem of updatedData.items) {
            const item = await Item.findById(updatedItem.item);
            if (!item) {
                return res.status(404).json({ message: `Item with ID ${updatedItem.item} not found` });
            }
            // Only check if the quantity is increasing or if it's a new item
            const originalQuantity = originalInvoice.items.find(oi => oi.item.toString() === updatedItem.item.toString())?.quantity || 0;
            if (item.quantityInStock + originalQuantity < updatedItem.quantity) {
                // Revert changes made so far before sending error
                for (const revertItem of updatedData.items) {
                    if (revertItem.item.toString() !== updatedItem.item.toString()) {
                        await Item.findByIdAndUpdate(revertItem.item, {
                            $inc: { quantityInStock: revertItem.quantity },
                        });
                    }
                }
                return res.status(400).json({ message: `Insufficient stock for ${item.name}. Available: ${item.quantityInStock + originalQuantity}, Requested: ${updatedItem.quantity}` });
            }
        }

        // Recalculate totals based on updated items
        console.log('[4/6] Recalculating invoice totals...');
        const customerDetails = await Customer.findById(updatedData.customer._id || updatedData.customer);
        if (!customerDetails) {
            return res.status(404).json({ message: 'Customer for invoice not found' });
        }

        const { subTotal, taxAmount, totalAmount: grandTotal } = calculateTotals(
            updatedData.items,
            customerDetails.state
        );
        const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
        const balance = grandTotal - (updatedData.paidAmount || 0);

        updatedData.subTotal = subTotal;
        updatedData.cgst = taxAmount.cgst;
        updatedData.sgst = taxAmount.sgst;
        updatedData.igst = taxAmount.igst;
        updatedData.totalTax = totalTax;
        updatedData.grandTotal = grandTotal;
        updatedData.balance = balance;
        updatedData.totalAmount = grandTotal; // For reporting consistency

        console.log('[4/6] Invoice totals recalculated.');
        console.log('Recalculated Totals:', { subTotal, taxAmount, grandTotal, balance });


        // Perform the update in the database
        console.log(`[5/6] Updating invoice ${id} in the database...`);
        const updatedInvoice = await Invoice.findByIdAndUpdate(id, updatedData, {
            new: true,
            runValidators: true,
        })
            .populate('customer')
            .populate('items.item');

        if (!updatedInvoice) {
            console.error(`[ERROR] Invoice with ID ${id} not found for update.`);
            return res.status(404).json({ message: 'Invoice not found' });
        }
        console.log(`[5/6] Invoice ${id} updated successfully in DB.`);

        // Decrement stock for updated items
        for (const updatedItem of updatedData.items) {
            await Item.findByIdAndUpdate(updatedItem.item, {
                $inc: { quantityInStock: -updatedItem.quantity },
            });
        }

        // After successful update, regenerate the PDF
        console.log(`[6/6] Regenerating PDF for invoice ${id}...`);
        let pdfPath = null;
        try {
            pdfPath = await pdfGenerator.generateInvoicePDF(updatedInvoice);
            updatedInvoice.pdfPath = pdfPath;
            await updatedInvoice.save();
            console.log(`[6/6] PDF for invoice ${id} regenerated.`);
        } catch (e) {
            console.error(`[WARN] PDF regeneration failed for invoice ${id}:`, e);
        }
        console.log('--- Invoice Update Process Finished ---');
        res.json(updatedInvoice);
    } catch (error) {
        console.error('--- [ERROR] Invoice Update Process Failed ---');
        console.error('Error details:', error);
        res.status(500).json({ message: 'Failed to update invoice', error: error.message });
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
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Revert stock changes
        for (const invoiceItem of invoice.items) {
            await Item.findByIdAndUpdate(invoiceItem.item, {
                $inc: { quantityInStock: invoiceItem.quantity },
            });
        }

        await invoice.deleteOne(); // Use the instance method to remove

        res.json({ message: 'Invoice removed successfully' });
    } catch (error) {
        console.error('[ERROR] Failed to delete invoice:', error);
        res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
    }
};

// Regenerate PDF for an existing invoice
const reprintInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        console.log(`[INFO] Starting reprint for invoice: ${invoiceId}`);

        const invoice = await Invoice.findById(invoiceId).populate('customer').populate('items.item');

        if (!invoice) {
            console.error(`[ERROR] Invoice not found: ${invoiceId}`);
            return res.status(404).json({ message: 'Invoice not found' });
        }

        console.log(`[INFO] Found invoice: ${invoice.invoiceNumber}`);

        // If grandTotal is 0 or null, it's likely a legacy invoice. Let's recalculate.
        const currentTotal = invoice.grandTotal || invoice.totalAmount || 0;
        if (!currentTotal || currentTotal <= 0) {
            console.warn(`[WARN] Reprinting legacy invoice ${invoiceId} with invalid grandTotal. Attempting to recalculate.`);

            if (!invoice.customer) {
                console.error(`[ERROR] Cannot recalculate for reprint: Customer data is missing for invoice ${invoiceId}`);
                return res.status(400).json({ message: 'Cannot recalculate for reprint: Customer data is missing.' });
            }
            if (!invoice.items || invoice.items.length === 0 || invoice.items.some(i => !i.item)) {
                console.error(`[ERROR] Cannot recalculate for reprint: Item data is missing for invoice ${invoiceId}`);
                return res.status(400).json({ message: 'Cannot recalculate for reprint: Item data is missing or not fully populated.' });
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

            console.log('[INFO] Recalculated Totals for reprint:', { newGrandTotal, newBalance });

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
            console.log(`[SUCCESS] Legacy invoice ${invoiceId} has been updated during reprint.`);
        }

        console.log(`[INFO] Generating PDF for invoice: ${invoice.invoiceNumber}`);
        const pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
        invoice.pdfPath = pdfPath;
        await invoice.save();

        console.log(`[SUCCESS] PDF generated successfully: ${pdfPath}`);
        res.json({ pdfPath, message: 'Invoice reprinted successfully' });
    } catch (error) {
        console.error('[ERROR] Failed to reprint invoice:', error);
        console.error('[ERROR] Stack trace:', error.stack);
        res.status(500).json({
            message: 'Failed to generate PDF',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Dashboard stats endpoint
const getDashboardStats = async (req, res) => {
    console.log('Fetching dashboard stats with query:', req.query);
    try {
        const { startDate, endDate } = req.query;

        // Build the date range query for aggregations using invoiceDate field
        let dateQuery = {};
        let hasDateFilter = false;

        if (startDate || endDate) {
            hasDateFilter = true;
            console.log(`Applying date filter: startDate=${startDate}, endDate=${endDate}`);

            if (startDate) {
                dateQuery.invoiceDate = { ...dateQuery.invoiceDate, $gte: new Date(startDate) };
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999); // Set to the end of the day
                dateQuery.invoiceDate = { ...dateQuery.invoiceDate, $lte: end };
            }
        }

        console.log('Constructed date query for invoices:', JSON.stringify(dateQuery));
        console.log('Has date filter:', hasDateFilter, 'Using date query:', Object.keys(dateQuery).length > 0);

        const totalInvoices = await Invoice.countDocuments(dateQuery);
        // Customer count is not typically filtered by invoice date range, so we count all customers.
        const totalCustomers = await Customer.countDocuments();

        const invoiceData = await Invoice.aggregate([
            { $match: dateQuery }, // Apply date filter (may be empty)
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$grandTotal' }, // Use grandTotal for revenue
                    totalPaid: { $sum: '$paidAmount' },
                },
            },
        ]);

        console.log('Invoice aggregation result:', invoiceData);

        const stats = {
            totalInvoices,
            totalCustomers,
            totalRevenue: invoiceData[0]?.totalRevenue || 0,
            totalPaid: invoiceData[0]?.totalPaid || 0,
            balanceDue: (invoiceData[0]?.totalRevenue || 0) - (invoiceData[0]?.totalPaid || 0),
        };
        console.log('Dashboard stats fetched successfully:', stats);
        res.json(stats);
    } catch (error) {
        console.error('[ERROR] Failed to fetch dashboard stats:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
};

/**
 * @desc    Generate QR code for payment
 * @route   GET /api/billing/invoices/:id/payment-qr
 * @access  Private
 */
const generatePaymentQr = async (req, res) => {
    console.log(`--- Generating Payment QR for Invoice ID: ${req.params.id} --`);
    try {
        const invoiceId = req.params.id;
        // Populate all related data in case a recalculation is needed
        const invoice = await Invoice.findById(invoiceId)
            .populate('customer')
            .populate('items.item');

        if (!invoice) {
            console.error(`[ERROR] Invoice not found for ID: ${invoiceId}`);
            return res.status(404).json({ message: 'Invoice not found' });
        }

        let grandTotal = invoice.grandTotal || 0;
        let paidAmount = invoice.paidAmount || 0;
        let balance = grandTotal - paidAmount;

        console.log(`[INFO] Initial Details: Grand Total=${grandTotal}, Paid Amount=${paidAmount}, Balance=${balance}`);

        // If grandTotal is 0, it's likely a legacy invoice. Let's recalculate.
        if (grandTotal <= 0) {
            console.warn(`[WARN] grandTotal is ${grandTotal}. Attempting to recalculate for legacy invoice.`);

            if (!invoice.customer) {
                return res.status(400).json({ message: 'Cannot recalculate: Customer data is missing.' });
            }
            if (!invoice.items || invoice.items.length === 0 || invoice.items.some(i => !i.item)) {
                return res.status(400).json({ message: 'Cannot recalculate: Item data is missing or not fully populated.' });
            }

            // Recalculate totals
            const populatedItemsForRecalc = invoice.items.map(i => {
                // Ensure we have a plain object with all necessary properties for calculation
                const itemData = i.item.toObject ? i.item.toObject() : i.item;
                return {
                    ...itemData,
                    quantity: i.quantity
                };
            });

            const { subTotal, taxAmount, totalAmount: newGrandTotal } = calculateTotals(
                populatedItemsForRecalc,
                invoice.customer.state
            );
            const newTotalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
            const newBalance = newGrandTotal - paidAmount;

            console.log('[INFO] Recalculated Totals:', { newGrandTotal, newBalance });

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
            console.log(`[SUCCESS] Legacy invoice ${invoiceId} has been updated with correct totals.`);

            // Use the new values for QR generation
            grandTotal = newGrandTotal;
            balance = newBalance;
        }


        if (balance <= 0) {
            console.warn(`[WARN] Request denied: Invoice is already fully paid or has zero balance. Balance: ${balance}`);
            return res.status(400).json({ message: 'Invoice is already fully paid' });
        }

        // Use environment variable for UPI ID, with a fallback
        const upiId = process.env.UPI_ID || 'shaikhtool@ibl';
        console.log(`[INFO] Generating QR with UPI ID: ${upiId} for amount: ${balance.toFixed(2)}`);

        const { qrCodeImage } = await generateUpiQr(upiId, balance.toFixed(2));

        console.log(`[SUCCESS] QR code generated successfully.`);
        res.json({ qrCodeImage });

    } catch (error) {
        console.error(`[FATAL] An unexpected error occurred:`, error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Generate PDF for public sharing (no auth required)
// @route   GET /api/billing/public/pdf/:invoiceId
// @access  Public
const generatePublicPdf = async (req, res) => {
    console.log('--- Public PDF Generation Request ---');
    try {
        const { invoiceId } = req.params;

        // Find the invoice
        const invoice = await Invoice.findById(invoiceId)
            .populate('customer')
            .populate('items.item');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        console.log(`Generating public PDF for invoice: ${invoice.invoiceNumber}`);

        // Generate PDF with a temporary filename
        const tempFileName = `public-invoice-${invoiceId}-${Date.now()}.pdf`;
        const pdfPath = await pdfGenerator.generateInvoicePdf(invoice, tempFileName);

        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Send the PDF file
        res.sendFile(pdfPath, (err) => {
            if (err) {
                console.error('Error sending PDF file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error sending PDF file' });
                }
            }

            // Auto-delete the file after 1 minute
            setTimeout(() => {
                const fs = require('fs');
                try {
                    if (fs.existsSync(pdfPath)) {
                        fs.unlinkSync(pdfPath);
                        console.log(`Temporary PDF deleted: ${tempFileName}`);
                    }
                } catch (deleteError) {
                    console.error('Error deleting temporary PDF:', deleteError);
                }
            }, 60000); // 1 minute = 60,000 milliseconds
        });

    } catch (error) {
        console.error('[ERROR] Public PDF generation failed:', error);
        res.status(500).json({
            message: 'Failed to generate PDF',
            error: error.message
        });
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
    generatePublicPdf, // Export the new function
};
