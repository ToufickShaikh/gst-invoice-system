const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoiceById, updateInvoice, reprintInvoice, getDashboardStats, generatePaymentQr, deleteInvoice, generatePublicPdf } = require('../controllers/billingController.js');

// Corrected routes to match frontend API calls
router.route('/invoices').post(createInvoice).get(getInvoices);
router.route('/dashboard-stats').get(getDashboardStats);
router.route('/invoices/:id').get(getInvoiceById).put(updateInvoice).delete(deleteInvoice); // Add delete handler
router.route('/invoices/:id/reprint').post(reprintInvoice);
// Corrected route to match frontend API call for generating QR code
router.route('/invoices/:id/payment-qr').get(generatePaymentQr);

// Public PDF generation route (no authentication required)
router.route('/public/pdf/:invoiceId').get(generatePublicPdf);

module.exports = router;