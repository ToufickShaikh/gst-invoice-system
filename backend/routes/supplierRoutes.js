const express = require('express');
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
// Auth removed — routes are public
const router = express.Router();

router.route('/')
    .get(getSuppliers)
    .post(createSupplier);

router.route('/:id')
    .get(getSuppliers) // Re-using getSuppliers to fetch single by ID
    .put(updateSupplier)
    .delete(deleteSupplier);

module.exports = router;
