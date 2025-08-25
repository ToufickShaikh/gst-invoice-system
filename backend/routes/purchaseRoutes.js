const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase, updatePurchase, deletePurchase } = require('../controllers/purchaseController');
// Auth removed — routes are public

router.route('/').get(getPurchases).post(createPurchase);
router.route('/:id').put(updatePurchase).delete(deletePurchase);

module.exports = router;