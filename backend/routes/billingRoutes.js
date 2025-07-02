import express from 'express';
import { createInvoice, getDashboardStats, getInvoices, updateInvoice, reprintInvoice, getInvoiceById } from '../controllers/billingController.js';

const router = express.Router();

// Update invoice by ID
router.put('/invoices/:id', updateInvoice);
router.post('/invoices', createInvoice);
// List all invoices
import Invoice from '../models/Invoice.js';
// List all invoices, with optional billingType filter
router.get('/', async (req, res) => {
    try {
        const { billingType } = req.query;
        const filter = {};
        if (billingType) filter.billingType = billingType;
        const invoices = await Invoice.find(filter).populate('customer').sort({ invoiceDate: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Support both GET and POST for dashboard stats for flexibility
router.get('/dashboard-stats', getDashboardStats);
router.post('/dashboard-stats', getDashboardStats);
// Route to reprint an invoice
router.post('/invoices/:id/reprint', reprintInvoice);
// Route to get a single invoice by ID
router.get('/invoices/:id', getInvoiceById);

export default router;