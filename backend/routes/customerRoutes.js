const express = require('express');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController.js');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all customer routes
router.use(protect);

router.route('/')
    .get(getCustomers)
    .post(createCustomer);

router.route('/:id')
    .get(getCustomers)
    .put(updateCustomer)
    .delete(deleteCustomer);

module.exports = router;