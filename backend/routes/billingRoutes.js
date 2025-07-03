const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoiceById, updateInvoice, reprintInvoice, getDashboardStats, generatePaymentQr } = require('../controllers/billingController.js');

// Corrected routes to match frontend API calls
router.route('/invoices').post(createInvoice).get(getInvoices);
router.route('/dashboard-stats').get(getDashboardStats);
router.route('/invoices/:id').get(getInvoiceById).put(updateInvoice);
router.route('/invoices/:id/reprint').post(reprintInvoice);
router.route('/invoices/:id/generate-qr').post(generatePaymentQr);

module.exports = router;