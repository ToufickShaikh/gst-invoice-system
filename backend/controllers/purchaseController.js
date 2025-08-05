const Purchase = require('../models/Purchase');
const Item = require('../models/Item');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// @desc    Get all purchase bills
// @route   GET /api/purchases
// @access  Private
exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().populate('items.item').populate('supplier');
    res.json(purchases);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve purchases', error);
  }
};

// @desc    Create a purchase bill
// @route   POST /api/purchases
// @access  Private
exports.createPurchase = async (req, res) => {
  const { supplier, items, notes } = req.body;

  try {
    const purchase = new Purchase({
      supplier,
      items,
      notes,
    });

    await purchase.save();

    // Update stock quantities
    for (const purchasedItem of items) {
      await Item.findByIdAndUpdate(purchasedItem.item, {
        $inc: { quantityInStock: purchasedItem.quantity },
      });
    }

    res.status(201).json(purchase);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to create purchase', error);
  }
};

// @desc    Update a purchase bill
// @route   PUT /api/purchases/:id
// @access  Private
exports.updatePurchase = async (req, res) => {
  const { id } = req.params;
  const { supplier, items, notes } = req.body;

  try {
    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Revert stock changes from the original purchase
    for (const purchasedItem of purchase.items) {
      await Item.findByIdAndUpdate(purchasedItem.item, {
        $inc: { quantityInStock: -purchasedItem.quantity },
      });
    }

    // Update purchase details
    purchase.supplier = supplier;
    purchase.items = items;
    purchase.notes = notes;

    await purchase.save();

    // Apply new stock changes
    for (const purchasedItem of items) {
      await Item.findByIdAndUpdate(purchasedItem.item, {
        $inc: { quantityInStock: purchasedItem.quantity },
      });
    }

    res.json(purchase);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update purchase', error);
  }
};

// @desc    Delete a purchase bill
// @route   DELETE /api/purchases/:id
// @access  Private
exports.deletePurchase = async (req, res) => {
  const { id } = req.params;

  try {
    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Revert stock changes from the purchase
    for (const purchasedItem of purchase.items) {
      await Item.findByIdAndUpdate(purchasedItem.item, {
        $inc: { quantityInStock: -purchasedItem.quantity },
      });
    }

    await purchase.deleteOne(); // Use deleteOne() for Mongoose 6+

    res.json({ message: 'Purchase removed' });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete purchase', error);
  }
};