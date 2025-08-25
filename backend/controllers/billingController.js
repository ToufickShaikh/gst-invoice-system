const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const pdfGenerator = require('../utils/pdfGenerator');
const { calculateTotals } = require('../utils/taxHelpers');
const { v4: uuidv4 } = require('uuid');
const { generateUpiQr } = require('../utils/upiHelper');
const fs = require('fs');
const path = require('path');
const company = require('../config/company');
const crypto = require('crypto');
const { cacheManager } = require('../utils/cacheManager');

// Helper to safely extract an ObjectId string from either an id string or a populated object
const extractId = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val._id) return typeof val._id === 'string' ? val._id : val._id.toString();
    if (val.id) return val.id;
    return null;
};

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
            const match = lastInvoice.invoiceNumber.match(new RegExp(`^${customerType}-(\\d+)$`));
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
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
    const { customer, customerName, items, discount = 0, shippingCharges = 0, paidAmount = 0, paymentMethod = '', billingType = '', exportInfo } = req.body;

    // Accept customer as either an id string or a populated object
    const customerIdFromBody = extractId(customer) || customer;

    // Input validation
    // Allow missing customer for POS quick billing when billingType === 'POS'
    if (!items || items.length === 0) {
        return sendErrorResponse(res, 400, 'At least one item is required');
    }
    if (!customer && String(billingType || '').toUpperCase() !== 'POS') {
        return sendErrorResponse(res, 400, 'Customer is required for non-POS invoices');
    }

    try {
        // Ensure customer data is populated for tax calculation
        let customerDetails = null;
        if (customerIdFromBody) {
            customerDetails = await Customer.findById(customerIdFromBody);
            if (!customerDetails) {
                return sendErrorResponse(res, 400, 'Customer not found');
            }
        } else {
            // POS quick billing: treat as anonymous B2C in company state
            customerDetails = {
                state: company.state || '',
                customerType: 'B2C',
                firmName: 'B2C-Guest'
            };
        }

        // Normalize items to backend shape
        const normalizedItems = items.map((it) => ({
            ...it,
            rate: it.rate ?? it.price ?? 0,
            taxSlab: it.taxSlab ?? it.taxRate ?? 0,
            name: it.name || it.item?.name || '',
            hsnCode: it.hsnCode || it.item?.hsnCode || '',
            quantity: Number(it.quantity) || 0,
        }));

        // Validate items (basic validation only, allow manual lines without item id)
        for (const invoiceItem of normalizedItems) {
            if (!invoiceItem.quantity || invoiceItem.rate === undefined) {
                return sendErrorResponse(res, 400, 'Each item must have a quantity and rate');
            }
            if (invoiceItem.quantity <= 0) {
                return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
            }
            if (invoiceItem.rate < 0) {
                return sendErrorResponse(res, 400, 'Rate cannot be negative');
            }
            if (invoiceItem.item) {
                const itemId = extractId(invoiceItem.item) || invoiceItem.item;
                const item = await Item.findById(itemId);
                if (!item) {
                    return sendErrorResponse(res, 404, `Item with ID ${itemId} not found`);
                }
            }
        }

        // Recalculate totals on the backend to ensure data integrity
        const { subTotal, taxAmount, totalAmount: grandTotal } = calculateTotals(normalizedItems, customerDetails.state);
        const balance = grandTotal - paidAmount;
        const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);

        // Generate sequential invoice number based on customer type
        const customerType = customerDetails.customerType;
        const invoiceNumber = await generateInvoiceNumber(customerType);

        const invoice = new Invoice({
            invoiceNumber,
            customer,
            items: normalizedItems,
            guestName: customerName || undefined,
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
            exportInfo: exportInfo || undefined,
        });

    await invoice.save();

    // Decrement stock quantities after successful save (can go negative) for linked catalog items only
        for (const invoiceItem of normalizedItems) {
            if (!invoiceItem.item) continue; // skip manual lines
            const itemId = extractId(invoiceItem.item) || invoiceItem.item;
            if (!itemId) continue;
            const updated = await Item.findByIdAndUpdate(itemId, {
                $inc: { quantityInStock: -invoiceItem.quantity },
            }, { new: true });
            if (updated && updated.quantityInStock < 0) {
                console.warn(`[INVOICE] Item ${updated.name} stock is negative after billing (${updated.quantityInStock}). Will be recovered by Purchases.`);
            }
        }

        // Do NOT generate/store PDF here; PDFs are generated on-demand via public endpoint

        // Invalidate invoices and dashboard caches so frontend shows fresh data
        try {
            await cacheManager.invalidatePattern('invoices');
            await cacheManager.invalidatePattern('dashboard');
        } catch (e) {
            console.warn('[CACHE] Failed to invalidate caches after invoice create', e && e.message);
        }

        return res.status(201).json(invoice);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to create invoice', error);
    }
};

// @desc    Update an existing invoice by ID
// @route   PUT /api/billing/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { customer, items, discount = 0, shippingCharges = 0, paidAmount = 0, paymentMethod = '', billingType = '', exportInfo } = req.body;

    // Input validation
    if (!customer || !items || items.length === 0) {
        return sendErrorResponse(res, 400, 'Customer and at least one item are required');
    }

    try {
        const originalInvoice = await Invoice.findById(id);
        if (!originalInvoice) {
            return sendErrorResponse(res, 404, 'Original invoice not found for update');
        }

        // Revert stock for original items (only catalog items)
        for (const originalItem of originalInvoice.items) {
            const originalItemId = extractId(originalItem.item) || originalItem.item;
            if (!originalItemId) continue;
            await Item.findByIdAndUpdate(originalItemId, {
                $inc: { quantityInStock: originalItem.quantity },
            });
        }

        // Ensure customer data is populated for tax calculation
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            return sendErrorResponse(res, 400, 'Customer for invoice not found');
        }

        // Normalize items
        const normalizedItems = items.map((it) => ({
            ...it,
            rate: it.rate ?? it.price ?? 0,
            taxSlab: it.taxSlab ?? it.taxRate ?? 0,
            name: it.name || it.item?.name || '',
            hsnCode: it.hsnCode || it.item?.hsnCode || '',
            quantity: Number(it.quantity) || 0,
        }));

        // Validate items (allow manual lines)
        for (const updatedItem of normalizedItems) {
            if (!updatedItem.quantity || updatedItem.rate === undefined) {
                return sendErrorResponse(res, 400, 'Each item must have a quantity and rate');
            }
            if (updatedItem.quantity <= 0) {
                return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
            }
            if (updatedItem.rate < 0) {
                return sendErrorResponse(res, 400, 'Rate cannot be negative');
            }
            if (updatedItem.item) {
                const item = await Item.findById(updatedItem.item);
                if (!item) {
                    return sendErrorResponse(res, 404, `Item with ID ${updatedItem.item} not found`);
                }
            }
        }

        // Recalculate totals based on updated items
        const { subTotal, taxAmount, totalAmount: grandTotal } = calculateTotals(normalizedItems, customerDetails.state);
        const totalTax = (taxAmount.cgst || 0) + (taxAmount.sgst || 0) + (taxAmount.igst || 0);
        const balance = grandTotal - paidAmount;

        const updatedInvoice = await Invoice.findByIdAndUpdate(id, {
            customer,
            items: normalizedItems,
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
            exportInfo: exportInfo || originalInvoice.exportInfo,
        }, { new: true, runValidators: true })
            .populate('customer')
            .populate('items.item');

        if (!updatedInvoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        // Decrement stock for updated items (only catalog items)
        for (const updatedItem of normalizedItems) {
            const updatedItemId = extractId(updatedItem.item) || updatedItem.item;
            if (!updatedItemId) continue;
            const updated = await Item.findByIdAndUpdate(updatedItemId, {
                $inc: { quantityInStock: -updatedItem.quantity },
            }, { new: true });
            if (updated && updated.quantityInStock < 0) {
                console.warn(`[INVOICE] Item ${updated.name} stock is negative after invoice update (${updated.quantityInStock}). Will be recovered by Purchases.`);
            }
        }

        // Do NOT regenerate/store PDF here; PDFs are generated on-demand via public endpoint

        // Invalidate caches after update
        try {
            await cacheManager.invalidatePattern('invoices');
            await cacheManager.invalidatePattern('dashboard');
        } catch (e) {
            console.warn('[CACHE] Failed to invalidate caches after invoice update', e && e.message);
        }

        return res.json(updatedInvoice);
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
        
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return sendErrorResponse(res, 400, 'Invalid invoice ID format');
        }

        const invoice = await Invoice.findById(id);

        if (!invoice) {
            return sendErrorResponse(res, 404, 'Invoice not found');
        }

        // Revert stock changes
        for (const invoiceItem of invoice.items) {
            const itemId = extractId(invoiceItem.item) || invoiceItem.item;
            if (!itemId) continue;
            await Item.findByIdAndUpdate(itemId, {
                $inc: { quantityInStock: invoiceItem.quantity },
            });
        }

        // Delete associated PDF file if it exists and looks like a local path
        if (invoice.pdfPath && typeof invoice.pdfPath === 'string') {
            const fileName = path.basename(invoice.pdfPath);
            const fullPath = path.resolve(__dirname, '../invoices', fileName);
            try {
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`[INFO] Deleted PDF file: ${fullPath}`);
                }
            } catch (fileError) {
                console.warn(`[WARN] Could not delete PDF file: ${fullPath}`, fileError.message);
            }
        }

        await Invoice.findByIdAndDelete(id);

        // Invalidate caches after delete
        try {
            await cacheManager.invalidatePattern('invoices');
            await cacheManager.invalidatePattern('dashboard');
        } catch (e) {
            console.warn('[CACHE] Failed to invalidate caches after invoice delete', e && e.message);
        }

        res.json({ 
            success: true,
            message: 'Invoice deleted successfully',
            deletedId: id 
        });
    } catch (error) {
        console.error('[ERROR] Delete invoice failed:', error);
        sendErrorResponse(res, 500, 'Failed to delete invoice', error);
    }
};

// Regenerate PDF for an existing invoice
const reprintInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const { format = 'a4' } = req.query; // Accept format parameter (a4, a5, thermal)
        
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

        // Generate PDF based on requested format
        let pdfPath;
        if (format === 'thermal') {
            pdfPath = await pdfGenerator.generateThermalPDF(invoice);
        } else {
            pdfPath = await pdfGenerator.generateInvoicePDF(invoice, format);
        }
        
        invoice.pdfPath = pdfPath;
        await invoice.save();

        res.json({ 
            pdfPath, 
            message: `Invoice reprinted successfully in ${format.toUpperCase()} format`,
            format 
        });
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

        const upiId = company.upi.id; // centralized from config/company.js
        // If balance is > 0, include amount; else generate QR without amount
        const amountForQr = balance > 0 ? balance.toFixed(2) : undefined;
        const { qrCodeImage } = await generateUpiQr(upiId, amountForQr);

        res.json({ qrCodeImage, amount: amountForQr || null });

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

        const format = req.query.format || 'a4';
        const tempFileName = `public-invoice-${invoiceId}-${Date.now()}.pdf`;
        let webPath;
        if (format === 'thermal') {
            try {
                webPath = await pdfGenerator.generateThermalPDF(invoice, tempFileName);
            } catch (pdfErr) {
                console.error('[BILLING] generateThermalPDF failed:', pdfErr && pdfErr.stack ? pdfErr.stack : pdfErr);
                // rethrow so outer catch returns 500
                throw pdfErr;
            }
        } else {
            webPath = await pdfGenerator.generateInvoicePDF(invoice, tempFileName);
        }
        const fileName = path.basename(webPath);
        const fullPath = path.resolve(__dirname, '../invoices', fileName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.sendFile(fullPath, (err) => {
            if (err) {
                console.error('Error sending PDF file:', err);
                if (!res.headersSent) {
                    sendErrorResponse(res, 500, 'Error sending PDF file', err);
                }
            }
            // Delete the temp PDF after 30 seconds
            setTimeout(() => {
                try {
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        console.log(`[INFO] Deleted temporary PDF: ${fullPath}`);
                    }
                } catch (deleteError) {
                    console.error('Error deleting temporary PDF:', deleteError);
                }
            }, 30000);
        });

    } catch (error) {
        sendErrorResponse(res, 500, 'Public PDF generation failed', error);
    }
};

// @desc    Record a payment for a customer and allocate across outstanding invoices (oldest first)
// @route   POST /api/billing/customers/:customerId/payments
// @access  Private
const recordCustomerPayment = async (req, res) => {
    try {
        const { customerId } = req.params;
        let { amount, method = 'Cash', date = new Date(), notes = '' } = req.body || {};

        amount = Number(amount);
        if (!customerId) return sendErrorResponse(res, 400, 'Customer ID is required');
        if (!amount || amount <= 0) return sendErrorResponse(res, 400, 'Valid payment amount is required');

        const customer = await Customer.findById(customerId);
        if (!customer) return sendErrorResponse(res, 404, 'Customer not found');

        // Fetch outstanding invoices for this customer
        const invoices = await Invoice.find({ customer: customerId })
            .sort({ invoiceDate: 1 })
            .select('_id invoiceNumber grandTotal paidAmount balance');

        let remaining = amount;
        const allocations = [];

        for (const inv of invoices) {
            const grandTotal = Number(inv.grandTotal || inv.totalAmount || 0);
            const paidAmount = Number(inv.paidAmount || 0);
            let balance = Number(inv.balance != null ? inv.balance : (grandTotal - paidAmount));

            if (balance <= 0) continue;
            if (remaining <= 0) break;

            const alloc = Math.min(balance, remaining);
            inv.paidAmount = paidAmount + alloc;
            inv.balance = Math.max(0, grandTotal - inv.paidAmount);
            await inv.save();

            allocations.push({
                invoiceId: inv._id,
                invoiceNumber: inv.invoiceNumber,
                allocated: alloc,
                remainingBalance: inv.balance,
            });

            remaining -= alloc;
        }

        res.json({
            success: true,
            customerId,
            customerName: customer.firmName || customer.name,
            totalPaid: amount,
            unallocated: remaining,
            method,
            date,
            notes,
            allocations,
        });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to record payment', error);
    }
};

// Create or refresh a portal link for an invoice (protected)
const createInvoicePortalLink = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendErrorResponse(res, 400, 'Invalid invoice ID format');
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) return sendErrorResponse(res, 404, 'Invoice not found');
    
    invoice.portalToken = crypto.randomBytes(16).toString('hex');
    // default expiry 30 days
    invoice.portalTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await invoice.save();

    // Improved base URL detection
    let publicBase;
    
    // Priority 1: Environment variable
    if (process.env.PUBLIC_BASE_URL) {
      publicBase = process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    } else {
      // Priority 2: Detect from request headers
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
      
      // Check if we're running under a subpath (like /shaikhcarpets)
      const referer = req.get('referer');
      let subpath = '';
      
      if (referer && referer.includes('/shaikhcarpets')) {
        subpath = '/shaikhcarpets';
      } else if (process.env.PUBLIC_BASE_PATH) {
        subpath = process.env.PUBLIC_BASE_PATH.startsWith('/') 
          ? process.env.PUBLIC_BASE_PATH 
          : `/${process.env.PUBLIC_BASE_PATH}`;
      }
      
            publicBase = `${protocol}://${host}${subpath}`;
    }
        // Final safety: if publicBase is falsy for any reason, fallback to known server IP + subpath
        if (!publicBase) {
            const fallbackHost = process.env.FALLBACK_PUBLIC_HOST || '185.52.53.253';
            const fallbackPath = process.env.PUBLIC_BASE_PATH || '/shaikhcarpets';
            publicBase = `https://${fallbackHost}${fallbackPath}`;
        }

        publicBase = publicBase.replace(/\/$/, '');
        const url = `${publicBase}/portal/invoice/${invoice._id}/${invoice.portalToken}`;
    
    console.log(`[INFO] Created portal link for invoice ${invoice.invoiceNumber}: ${url}`);
    
        // Invalidate invoice list cache so portal token shows up in subsequent fetches
        try {
            await cacheManager.invalidatePattern('invoices');
        } catch (e) {
            console.warn('[CACHE] Failed to invalidate invoices cache after portal link creation', e && e.message);
        }

        res.json({ 
            success: true,
            url: url || '', 
            token: invoice.portalToken, 
            expiresAt: invoice.portalTokenExpires,
            invoiceNumber: invoice.invoiceNumber
        });
  } catch (error) {
    console.error('[ERROR] Create portal link failed:', error);
    sendErrorResponse(res, 500, 'Failed to create portal link', error);
  }
};

// Create or refresh a portal link for a customer (protected)
const createCustomerPortalLink = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findById(customerId);
    if (!customer) return sendErrorResponse(res, 404, 'Customer not found');
    customer.portalToken = crypto.randomBytes(16).toString('hex');
    customer.portalTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await customer.save();
            const detectBaseFromReferer2 = () => {
                try {
                    const ref = req.get('referer') || req.get('origin');
                    if (!ref) return null;
                    const u = new URL(ref);
                    if (u.pathname && u.pathname.includes('/shaikhcarpets')) return `${u.origin}/shaikhcarpets`;
                    const seg = u.pathname && u.pathname.split('/').filter(Boolean)[0];
                    if (seg) return `${u.origin}/${seg}`;
                    return u.origin;
                } catch (e) {
                    return null;
                }
            };

                        // Determine public base with several fallbacks
                        let publicBase = process.env.PUBLIC_BASE_URL
                                || detectBaseFromReferer2()
                                || ((req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host') || 'localhost:3000')) + (process.env.PUBLIC_BASE_PATH || '');
                        if (!publicBase) {
                            const fallbackHost = process.env.FALLBACK_PUBLIC_HOST || '185.52.53.253';
                            const fallbackPath = process.env.PUBLIC_BASE_PATH || '/shaikhcarpets';
                            publicBase = `https://${fallbackHost}${fallbackPath}`;
                        }
                        const url = `${publicBase.replace(/\/$/, '')}/portal/customer/${customer._id}/${customer.portalToken}/statement`;
        try {
            await cacheManager.invalidatePattern('invoices');
        } catch (e) {
            console.warn('[CACHE] Failed to invalidate invoices cache after customer portal link creation', e && e.message);
        }
        res.json({ url: url || '', token: customer.portalToken, expiresAt: customer.portalTokenExpires });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to create customer portal link', error);
  }
};

// Public: Get invoice details with optional payment QR (by token)
const getPublicInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const invoice = await Invoice.findById(id).populate('customer').populate('items.item');
    if (!invoice) return sendErrorResponse(res, 404, 'Invoice not found');
    if (!invoice.portalToken || token !== invoice.portalToken) return sendErrorResponse(res, 401, 'Invalid token');
    if (invoice.portalTokenExpires && new Date(invoice.portalTokenExpires) < new Date()) return sendErrorResponse(res, 401, 'Portal link expired');

    const totalForBalance = (invoice.grandTotal != null ? invoice.grandTotal : invoice.totalAmount) || 0;
    const paidForBalance = Number(invoice.paidAmount || 0);
    const balance = Number(invoice.balance ?? (totalForBalance - paidForBalance));

    const upiId = company?.upi?.id || process.env.UPI_ID || '';
    let qrCodeImage = '';
    try {
      if (upiId) {
        const amountForQr = balance > 0 ? balance.toFixed(2) : undefined;
        const qr = await generateUpiQr(upiId, amountForQr);
        qrCodeImage = qr.qrCodeImage;
      }
    } catch (e) { /* ignore QR errors */ }

    res.json({
      invoice,
      company,
      payment: { balance, upiId, qrCodeImage },
      pdfUrl: `/api/billing/public/pdf/${invoice._id}`
    });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch public invoice', error);
  }
};

// @desc    Generate printable thermal HTML for public viewing/print
// @route   GET /api/billing/public/print/thermal/:invoiceId
// @access  Public
const generatePublicThermalHtml = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { token } = req.query;
        const invoice = await Invoice.findById(invoiceId).populate('customer').populate('items.item');
        if (!invoice) return sendErrorResponse(res, 404, 'Invoice not found');
        if (!invoice.portalToken || token !== invoice.portalToken) return sendErrorResponse(res, 401, 'Invalid token');
        if (invoice.portalTokenExpires && new Date(invoice.portalTokenExpires) < new Date()) return sendErrorResponse(res, 401, 'Portal link expired');

        // Read template and replace placeholders using existing helper
        const templatePath = path.resolve(__dirname, '../templates/thermal-2in5.html');
        let html = await fs.readFile(templatePath, 'utf-8');
        html = await replacePlaceholders(html, invoice);

        // Inject preview/print script to allow user to choose print or download
        const script = `<script>
            function openWindow(url) { window.open(url, '_blank'); }
            window.addEventListener('load', function(){
                const printBtn = document.getElementById('printBtn');
                const downloadPdfBtn = document.getElementById('downloadPdfBtn');
                const downloadA4Btn = document.getElementById('downloadA4Btn');
                if (printBtn) printBtn.addEventListener('click', function(){ window.print(); });
                if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', function(){ openWindow('/api/billing/public/pdf/${invoice._id}?format=thermal'); });
                if (downloadA4Btn) downloadA4Btn.addEventListener('click', function(){ openWindow('/api/billing/public/pdf/${invoice._id}'); });
                // attempt to auto-open UPI deep link if present (may be blocked by popup rules)
                const upiAnchor = document.getElementById('upiAnchor');
                if (upiAnchor && upiAnchor.href) {
                    try { window.location.href = upiAnchor.href; } catch(e) { /* ignore */ }
                }
            });
        </script>`;

        // Serve as HTML for direct preview (do not force download)
        res.setHeader('Content-Type', 'text/html');
        res.send(html + script);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to generate thermal HTML', error);
    }
};

// Public: Get customer statement by token and date range
const getPublicCustomerStatement = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { token, from, to } = req.query;
    const customer = await Customer.findById(customerId);
    if (!customer) return sendErrorResponse(res, 404, 'Customer not found');
    if (!customer.portalToken || token !== customer.portalToken) return sendErrorResponse(res, 401, 'Invalid token');
    if (customer.portalTokenExpires && new Date(customer.portalTokenExpires) < new Date()) return sendErrorResponse(res, 401, 'Portal link expired');

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();

    const invoices = await Invoice.find({ customer: customer._id, invoiceDate: { $gte: start, $lte: end } }).sort({ invoiceDate: 1 });

    const summary = invoices.reduce((acc, inv) => {
      const total = Number(inv.grandTotal || inv.totalAmount || 0);
      const paid = Number(inv.paidAmount || 0);
      const bal = Number(inv.balance ?? (total - paid));
      acc.total += total; acc.paid += paid; acc.balance += bal; return acc;
    }, { total: 0, paid: 0, balance: 0 });

    res.json({ customer, company, period: { from: start, to: end }, invoices, summary });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch public statement', error);
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
    recordCustomerPayment,
    createInvoicePortalLink,
    createCustomerPortalLink,
    getPublicInvoice,
    getPublicCustomerStatement,
    generatePublicThermalHtml,
};