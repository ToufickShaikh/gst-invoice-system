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
import Invoice from '../models/Invoice.js';
import { v4 as uuidv4 } from 'uuid';
import { generatePdf } from '../utils/pdfGenerator.js';

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
            // PDF generation failed, but invoice is saved
        }
        res.status(201).json({ invoice, pdfPath });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};