const express = require('express');
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController.js');
// Auth removed — routes are public
const router = express.Router();

router.route('/')
    .get(getCustomers)
    .post(createCustomer);

router.route('/:id')
    .get(getCustomers)
    .put(updateCustomer)
    .delete(deleteCustomer);

module.exports = router;