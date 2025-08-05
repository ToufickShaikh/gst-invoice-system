const express = require('express');
const router = express.Router();
const { getSalesOrders, createSalesOrder, convertToInvoice } = require('../controllers/salesOrderController');

router.route('/').get(getSalesOrders).post(createSalesOrder);
router.route('/:id/convert-to-invoice').post(convertToInvoice);

module.exports = router;
