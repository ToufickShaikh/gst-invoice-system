// Clean invoice routes (version 2). Mount suggested path: /api/invoices
// Keep them separate from legacy billingRoutes while migrating.

const express = require('express');
const ctrl = require('../controllers/invoiceController.v2');
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if auth required

const router = express.Router();

// Private (add protect as needed)
router.get('/', /*protect,*/ ctrl.list);
router.post('/', /*protect,*/ ctrl.create);
// Public (token optional) - define before parameterized :id to avoid conflicts
// These endpoints work without a token for public access; if a portal token
// exists for an invoice it will be validated when supplied.
router.get('/public/:id/pdf', ctrl.publicPdf); // format=thermal|a4
router.get('/public/:id', ctrl.publicInvoice);

// Payment QR (private)
router.get('/:id/payment-qr', /*protect,*/ ctrl.generatePaymentQr);

// Customer payment allocation
router.post('/customers/:customerId/payments', /*protect,*/ ctrl.recordCustomerPayment);

// Private detail routes
router.get('/:id', /*protect,*/ ctrl.get);
router.put('/:id', /*protect,*/ ctrl.update);
router.delete('/:id', /*protect,*/ ctrl.remove);
router.post('/:id/reprint', /*protect,*/ ctrl.reprint);
router.post('/:id/portal-link', /*protect,*/ ctrl.portalLink);

module.exports = router;
