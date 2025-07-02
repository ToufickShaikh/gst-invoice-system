import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js'; // Import Customer model
import Item from '../models/Item.js'; // Import Item model
import { v4 as uuidv4 } from 'uuid';
import { generatePdf } from '../utils/pdfGenerator.js';
import { calculateTax } from '../utils/taxHelpers.js'; // Helper for tax calculation
import { generateUpiQr } from '../utils/upiHelper.js';
const { calculateTotals } = require('../utils/taxHelpers');

// Recalculate invoice totals based on items, discount, and shipping
const recalculateInvoiceTotals = async (invoiceData) => {
    const customer = await Customer.findById(invoiceData.customer);
    if (!customer) {
        throw new Error('Customer not found');
    }

    // Ensure all items have full details before calculating
    const populatedItems = await Promise.all(
        (invoiceData.items || []).map(async (item) => {
            if (item.price && item.taxSlab !== undefined) {
                return item; // Item already has details
            }
            // If details are missing, fetch them from the DB
            const dbItem = await Item.findById(item.item || item.itemId);
            if (!dbItem) throw new Error(`Item with ID ${item.item || item.itemId} not found.`);
            return {
                ...item,
                price: dbItem.price,
                taxSlab: dbItem.taxSlab,
                name: dbItem.name,
                hsnCode: dbItem.hsnCode,
            };
        })
    );

    const isInterState = customer.firmAddress && !customer.firmAddress.toLowerCase().includes('maharashtra');

    const totalBeforeDiscount = populatedItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    const itemsWithTax = populatedItems.map(item => {
        const itemTotal = item.price * item.quantity;
        const discountAmount = totalBeforeDiscount > 0 ? (itemTotal / totalBeforeDiscount) * (invoiceData.discount || 0) : 0;
        const taxableAmount = itemTotal - discountAmount;
        const tax = calculateTax(taxableAmount, item.taxSlab, isInterState);

        return {
            ...item,
            itemTotal,
            discountAmount,
            taxableAmount,
            tax,
            totalWithTax: taxableAmount + tax.total,
        };
    });

    const totalBeforeTax = itemsWithTax.reduce((sum, item) => sum + item.taxableAmount, 0);
    const totalTax = itemsWithTax.reduce((sum, item) => sum + item.tax.total, 0);
    const grandTotal = totalBeforeTax + totalTax + (invoiceData.shippingCharges || 0);
    const balance = grandTotal - (invoiceData.paidAmount || 0);

    return {
        ...invoiceData,
        items: itemsWithTax,
        totalBeforeTax,
        totalTax,
        grandTotal,
        totalAmount: grandTotal, // totalAmount is used for reporting
        balance,
    };
};

// Create a new invoice
export const createInvoice = async (req, res) => {
    try {
        const {
            customer,
            items,
            discount = 0,
            shippingCharges = 0,
            totalBeforeTax = 0,
            totalTax = 0,
            grandTotal = 0,
            paidAmount = 0,
            balance = 0,
            paymentMethod = '',
            billingType = ''
        } = req.body;
        const invoiceNumber = `INV-${uuidv4()}`;

        // Calculate totalAmount as grandTotal (for reporting)
        const totalAmount = grandTotal;

        const invoice = new Invoice({
            invoiceNumber,
            customer,
            items,
            discount,
            shippingCharges,
            totalBeforeTax,
            totalTax,
            grandTotal,
            totalAmount,
            paidAmount,
            balance,
            paymentMethod,
            billingType
        });
        await invoice.save();

        // Optionally, generate PDF and return its path
        let pdfPath = null;
        try {
            pdfPath = await generatePdf(invoice);
        } catch (e) {
            console.error('PDF generation failed during creation:', e); // Log error
            // PDF generation failed, but invoice is saved
        }
        res.status(201).json({ invoice, pdfPath });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Update an existing invoice by ID
// @desc    Update an invoice
// @route   PUT /api/billing/invoices/:id
// @access  Private
export const updateInvoice = async (req, res) => {
    console.log('--- Starting Invoice Update Process ---');
    try {
        const { id } = req.params;
        const updatedData = req.body;
        console.log(`[1/6] Received request to update invoice ${id}`);
        console.log('[2/6] Request body:', JSON.stringify(updatedData, null, 2));

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

        // Recalculate totals based on updated items
        console.log('[4/6] Recalculating invoice totals...');
        const { subTotal, taxAmount, totalAmount } = calculateTotals(
            updatedData.items,
            updatedData.customer.state // Pass customer state for tax calculation
        );

        updatedData.subTotal = subTotal;
        updatedData.cgst = taxAmount.cgst;
        updatedData.sgst = taxAmount.sgst;
        updatedData.igst = taxAmount.igst;
        updatedData.totalAmount = totalAmount;
        console.log('[4/6] Invoice totals recalculated.');
        console.log('Recalculated Totals:', { subTotal, taxAmount, totalAmount });


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

        // After successful update, regenerate the PDF
        console.log(`[6/6] Regenerating PDF for invoice ${id}...`);
        await pdfGenerator.generateInvoicePDF(updatedInvoice);
        console.log(`[6/6] PDF for invoice ${id} regenerated.`);
        console.log('--- Invoice Update Process Finished ---');


        res.json(updatedInvoice);
    } catch (error) {
        console.error('--- [ERROR] Invoice Update Process Failed ---');
        console.error('Error details:', error);
        res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
};

// Regenerate PDF for an existing invoice
export const reprintInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await Invoice.findById(invoiceId).populate('customer').populate('items.item');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const pdfPath = await generatePdf(invoice);
        res.json({ pdfPath, message: 'Invoice reprinted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Dashboard stats endpoint
export const getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const filter = {};
        if (startDate) filter.invoiceDate = { $gte: new Date(startDate) };
        if (endDate) {
            filter.invoiceDate = filter.invoiceDate || {};
            filter.invoiceDate.$lte = new Date(endDate);
        }

        const invoices = await Invoice.find(filter);
        let totalSales = 0;
        let totalPayable = 0;
        let totalReceivable = 0;
        invoices.forEach(inv => {
            totalSales += inv.totalAmount || 0;
            const balance = (inv.totalAmount || 0) - (inv.paidAmount || 0);
            if (balance > 0) totalReceivable += balance;
            else totalPayable += Math.abs(balance);
        });
        res.json({ totalSales, totalPayable, totalReceivable });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Generate UPI QR code for payment
export const generatePaymentQr = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const balance = (invoice.grandTotal || 0) - (invoice.paidAmount || 0);

        if (balance <= 0) {
            return res.status(400).json({ message: 'Invoice is already fully paid' });
        }

        const upiId = 'shaikhtool@ibl'; // Hardcoded UPI ID
        const { qrCodeImage } = await generateUpiQr(upiId, balance.toFixed(2));

        res.json({ qrCodeImage });

    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Get a single invoice by ID
export const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer').populate('items.item');
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Get all invoices
export const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find().populate('customer').populate('items.item');
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
