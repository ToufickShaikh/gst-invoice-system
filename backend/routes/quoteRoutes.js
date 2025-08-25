const express = require('express');
const router = express.Router();
const { getQuotes, createQuote, updateQuote, deleteQuote, convertToSalesOrder } = require('../controllers/quoteController');
// Auth removed — routes are public

router.route('/').get(getQuotes).post(createQuote);
router.route('/:id').put(updateQuote).delete(deleteQuote);
router.route('/:id/convert-to-sales-order').post(convertToSalesOrder);

module.exports = router;
