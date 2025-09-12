// Clean invoice routes (version 2). Mount suggested path: /api/invoices
// Keep them separate from legacy billingRoutes while migrating.

const express = require('express');
const ctrl = require('../controllers/invoiceController.v2');
const { cacheMiddleware, cacheConfig } = require('../utils/cacheManager');
const router = express.Router();

// Private (add protect as needed)
router.get('/', cacheMiddleware(cacheConfig.invoices.ttl, cacheConfig.invoices.key), ctrl.list);
router.post('/', ctrl.create);

// Public (token optional) - define before parameterized :id to avoid conflicts
// These endpoints work without a token for public access; if a portal token
// exists for an invoice it will be validated when supplied.
router.get('/public/:id/pdf', ctrl.publicPdf); // format=thermal|a4
router.get('/public/:id', ctrl.publicInvoice);

// Payment QR (private)
router.get('/:id/payment-qr', ctrl.generatePaymentQr);

// Customer payment allocation
router.post('/customers/:customerId/payments', ctrl.recordCustomerPayment);

// Private detail routes
router.get('/:id', cacheMiddleware(cacheConfig.invoice_detail.ttl, cacheConfig.invoice_detail.key), ctrl.get);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/reprint', ctrl.reprint);
router.post('/:id/portal-link', ctrl.portalLink);

module.exports = router;