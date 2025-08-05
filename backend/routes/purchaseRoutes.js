const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase } = require('../controllers/purchaseController');

router.route('/').get(getPurchases).post(createPurchase);

module.exports = router;
