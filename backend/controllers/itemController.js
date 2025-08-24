vconst Item = require('../models/Item.js');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// @desc    Get all items or a single item by ID
// @route   GET /api/items
// @route   GET /api/items/:id
// @access  Private
const getItems = async (req, res) => {
    try {
        if (req.params.id) {
            const item = await Item.findById(req.params.id);
            if (!item) {
                return sendErrorResponse(res, 404, 'Item not found');
            }
            res.json(item);
        } else {
            const items = await Item.find(req.query).sort({ name: 1 });
            res.json(items);
        }
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to retrieve items', error);
    }
};

// @desc    Create a new item
// @route   POST /api/items
// @access  Private
const createItem = async (req, res) => {
    const { name, hsnCode, rate, priceType, taxSlab, units, quantityInStock } = req.body;

    // Basic input validation — treat 0 as a valid numeric value for rate and taxSlab
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!hsnCode) missingFields.push('hsnCode');
    // rate and taxSlab can be 0 — only reject when they are null/undefined
    if (rate == null) missingFields.push('rate');
    if (taxSlab == null) missingFields.push('taxSlab');
    if (!units) missingFields.push('units');

    if (missingFields.length > 0) {
        return sendErrorResponse(res, 400, `Please include required item fields: ${missingFields.join(', ')}`);
    }

    try {
        console.log('[ITEM] Create request received:', req.body);
        const item = new Item({
            name,
            hsnCode,
            rate,
            priceType: priceType || 'Exclusive', // Default to Exclusive if not provided
            taxSlab,
            units,
            quantityInStock: quantityInStock || 0, // Default to 0 if not provided
        });
        await item.save();
        console.log('[ITEM] Item created successfully:', item._id);
        res.status(201).json(item);
    } catch (error) {
        console.error('[ITEM] Error creating item:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            sendErrorResponse(res, 400, 'Validation failed', { messages: validationErrors, details: error.errors });
        } else if (error.code === 11000) {
            sendErrorResponse(res, 400, 'Item with this name or HSN Code already exists', error);
        } else {
            sendErrorResponse(res, 500, 'Failed to create item', error);
        }
    }
};

// @desc    Update an existing item by ID
// @route   PUT /api/items/:id
// @access  Private
const updateItem = async (req, res) => {
    try {
        console.log('[ITEM] Update request for ID:', req.params.id);
        console.log('[ITEM] Update data:', req.body);

        const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!item) {
            return sendErrorResponse(res, 404, 'Item not found');
        }
        console.log('[ITEM] Item updated successfully:', item._id);
        res.json(item);
    } catch (error) {
        console.error('[ITEM] Error updating item:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            sendErrorResponse(res, 400, 'Validation failed', { messages: validationErrors, details: error.errors });
        } else if (error.code === 11000) {
            sendErrorResponse(res, 400, 'Item with this name or HSN Code already exists', error);
        } else {
            sendErrorResponse(res, 500, 'Failed to update item', error);
        }
    }
};

// @desc    Delete an item by ID
// @route   DELETE /api/items/:id
// @access  Private
const deleteItem = async (req, res) => {
    try {
        console.log('[ITEM] Delete request for ID:', req.params.id);
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) {
            return sendErrorResponse(res, 404, 'Item not found');
        }
        console.log('[ITEM] Item deleted successfully:', item._id);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to delete item', error);
    }
};

// @desc    Update item stock quantity
// @route   PATCH /api/items/:id/stock
// @access  Private
const updateStock = async (req, res) => {
    try {
        const { quantityChange } = req.body;
        
        if (quantityChange === undefined) {
            return sendErrorResponse(res, 400, 'quantityChange is required');
        }

        const item = await Item.findByIdAndUpdate(
            req.params.id,
            { $inc: { quantityInStock: quantityChange } },
            { new: true, runValidators: true }
        );

        if (!item) {
            return sendErrorResponse(res, 404, 'Item not found');
        }

        // Allow negative stock (backorder). Just warn in logs instead of reverting.
        if (item.quantityInStock < 0) {
            console.warn(`[ITEM] Stock for ${item.name} is negative (${item.quantityInStock}). This will be recovered by Purchases.`);
        }

        const operation = quantityChange > 0 ? 'increased' : 'decreased';
        console.log(`[ITEM] Stock ${operation} for item ${item.name} by ${Math.abs(quantityChange)}. New stock: ${item.quantityInStock}`);
        res.json(item);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to update item stock', error);
    }
};

module.exports = {
    getItems,
    createItem,
    updateItem,
    deleteItem,
    updateStock,
};