// Clean invoice routes (version 2). Mount suggested path: /api/invoices
// Keep them separate from legacy billingRoutes while migrating.

const express = require('express');
const ctrl = require('../controllers/invoiceController.v2');
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if auth required

const router = express.Router();

// Private (add protect as needed)
router.get('/', /*protect,*/ ctrl.list);
router.post('/', /*protect,*/ ctrl.create);
// Public (token gated) - define before parameterized :id to avoid conflicts
router.get('/public/:id/pdf', ctrl.publicPdf); // ?token=...&format=thermal|a4
router.get('/public/:id', ctrl.publicInvoice); // ?token=...

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
