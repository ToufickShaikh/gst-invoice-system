const express = require('express');
const router = express.Router();
const { getSalesOrders, createSalesOrder, convertToInvoice, updateSalesOrder, deleteSalesOrder } = require('../controllers/salesOrderController');
const { protect } = require('../middleware/authMiddleware');

// Protect all sales order routes
router.use(protect);

router.route('/').get(getSalesOrders).post(createSalesOrder);
router.route('/:id').put(updateSalesOrder).delete(deleteSalesOrder);
router.route('/:id/convert-to-invoice').post(convertToInvoice);

module.exports = router;
