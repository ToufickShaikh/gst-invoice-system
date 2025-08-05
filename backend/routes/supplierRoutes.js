const express = require('express');
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/supplierController');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

const router = express.Router();

// Protect all supplier routes
router.use(protect);

router.route('/')
    .get(getSuppliers)
    .post(createSupplier);

router.route('/:id')
    .get(getSuppliers) // Re-using getSuppliers to fetch single by ID
    .put(updateSupplier)
    .delete(deleteSupplier);

module.exports = router;
