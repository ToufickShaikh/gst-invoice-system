import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js'; // Import Customer model
import Item from '../models/Item.js'; // Import Item model
import { v4 as uuidv4 } from 'uuid';
import { generatePdf } from '../utils/pdfGenerator.js';
import { calculateTax } from '../utils/taxHelpers.js'; // Helper for tax calculation
import { generateUpiQr } from '../utils/upiHelper.js';

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
export const updateInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const updateData = req.body;

        // Prevent invoiceNumber from being changed
        if (updateData.invoiceNumber) {
            delete updateData.invoiceNumber;
        }

        // Recalculate all totals if items, discount or shipping charges are changed
        const recalculatedData = await recalculateInvoiceTotals(updateData);

        const updatedInvoice = await Invoice.findByIdAndUpdate(
            invoiceId,
            recalculatedData,
            { new: true }
        ).populate('customer').populate('items.item');

        if (!updatedInvoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Optionally regenerate the PDF
        let pdfPath = null;
        try {
            pdfPath = await generatePdf(updatedInvoice);
        } catch (e) {
            console.error('PDF regeneration failed during update:', e); // Log error
        }

        res.json({ invoice: updatedInvoice, pdfPath });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
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
