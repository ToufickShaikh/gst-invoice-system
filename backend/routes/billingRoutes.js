const express = require('express');
const router = express.Router();
const { createInvoice, getInvoices, getInvoiceById, updateInvoice, reprintInvoice, getDashboardStats, generatePaymentQr } = require('../controllers/billingController.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// All routes are protected
router.use(authMiddleware);

router.route('/').post(createInvoice).get(getInvoices);
router.route('/stats').get(getDashboardStats);
router.route('/:id').get(getInvoiceById).put(updateInvoice);
router.route('/:id/reprint').post(reprintInvoice);
router.route('/:id/generate-qr').post(generatePaymentQr);

module.exports = router;