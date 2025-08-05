const Supplier = require('../models/Supplier');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// @desc    Get all suppliers or a single supplier by ID
// @route   GET /api/suppliers
// @route   GET /api/suppliers/:id
// @access  Private
const getSuppliers = async (req, res) => {
    try {
        if (req.params.id) {
            const supplier = await Supplier.findById(req.params.id);
            if (!supplier) {
                return res.status(404).json({ message: 'Supplier not found' });
            }
            res.json(supplier);
        } else {
            const suppliers = await Supplier.find(req.query).sort({ name: 1 });
            res.json(suppliers);
        }
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to retrieve suppliers', error);
    }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
// @access  Private
const createSupplier = async (req, res) => {
    try {
        const supplier = new Supplier(req.body);
        await supplier.save();
        res.status(201).json(supplier);
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error
            sendErrorResponse(res, 400, 'Supplier with this name or GSTIN already exists', error);
        } else if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            sendErrorResponse(res, 400, 'Validation failed', { messages: validationErrors, details: error.errors });
        } else {
            sendErrorResponse(res, 500, 'Failed to create supplier', error);
        }
    }
};

// @desc    Update a supplier by ID
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        res.json(supplier);
    } catch (error) {
        if (error.code === 11000) {
            sendErrorResponse(res, 400, 'Supplier with this name or GSTIN already exists', error);
        } else if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            sendErrorResponse(res, 400, 'Validation failed', { messages: validationErrors, details: error.errors });
        } else {
            sendErrorResponse(res, 500, 'Failed to update supplier', error);
        }
    }
};

// @desc    Delete a supplier by ID
// @route   DELETE /api/suppliers/:id
// @access  Private
const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        // TODO: Consider what happens to associated purchases when a supplier is deleted.
        // For now, we'll just delete the supplier.
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to delete supplier', error);
    }
};

module.exports = {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
};
