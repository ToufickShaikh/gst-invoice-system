const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoiceById, updateInvoice, reprintInvoice, getDashboardStats, generatePaymentQr, deleteInvoice, generatePublicPdf, generatePublicThermalHtml, recordCustomerPayment, createInvoicePortalLink, createCustomerPortalLink, getPublicInvoice, getPublicCustomerStatement } = require('../controllers/billingController.js');
// Auth removed — public routes and protected behavior disabled
// Public routes (no auth)
router.route('/public/pdf/:invoiceId').get(generatePublicPdf);
router.route('/public/print/thermal/:invoiceId').get(generatePublicThermalHtml);
router.route('/public/invoices/:id').get(getPublicInvoice);
router.route('/public/customers/:customerId/statement').get(getPublicCustomerStatement);

// Protect all billing routes below
router.use(protect);

// Corrected routes to match frontend API calls
router.route('/invoices').post(createInvoice).get(getInvoices);
router.route('/dashboard-stats').get(getDashboardStats);
router.route('/invoices/:id').get(getInvoiceById).put(updateInvoice).delete(deleteInvoice); // Add delete handler
router.route('/invoices/:id/reprint').post(reprintInvoice);
// QR code for invoice payment (protected)
router.route('/invoices/:id/payment-qr').get(generatePaymentQr);

// Customer-level payment routes (protected)
router.route('/customers/:customerId/payments').post(recordCustomerPayment);

// Portal link creators (protected)
router.route('/invoices/:id/portal-link').post(createInvoicePortalLink);
router.route('/customers/:customerId/portal-link').post(createCustomerPortalLink);

module.exports = router;