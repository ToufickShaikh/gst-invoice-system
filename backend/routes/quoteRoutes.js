const express = require('express');
const router = express.Router();
const { getQuotes, createQuote } = require('../controllers/quoteController');

router.route('/').get(getQuotes).post(createQuote);

module.exports = router;
