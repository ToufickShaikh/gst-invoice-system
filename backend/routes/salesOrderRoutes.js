const express = require('express');
const router = express.Router();
const { getSalesOrders, createSalesOrder, convertToInvoice, updateSalesOrder, deleteSalesOrder } = require('../controllers/salesOrderController');
// Auth removed — routes are public

router.route('/').get(getSalesOrders).post(createSalesOrder);
router.route('/:id').put(updateSalesOrder).delete(deleteSalesOrder);
router.route('/:id/convert-to-invoice').post(convertToInvoice);

module.exports = router;
