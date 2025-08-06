const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase, updatePurchase, deletePurchase } = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

// Protect all purchase routes
router.use(protect);

router.route('/').get(getPurchases).post(createPurchase);
router.route('/:id').put(updatePurchase).delete(deletePurchase);

module.exports = router;