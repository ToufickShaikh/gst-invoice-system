import express from 'express';
import { createInvoice, getDashboardStats } from '../controllers/billingController.js';

const router = express.Router();

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
router.post('/dashboard-stats', getDashboardStats);

export default router;