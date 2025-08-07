const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
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
  
  console.log('[PURCHASE] Create purchase request received:');
  console.log('- Supplier:', supplier);
  console.log('- Items:', JSON.stringify(items, null, 2));
  console.log('- Notes:', notes);

  // Basic input validation
  if (!supplier || !items || items.length === 0) {
    return sendErrorResponse(res, 400, 'Supplier and at least one item are required');
  }

  try {
    // Validate supplier exists
    const existingSupplier = await Supplier.findById(supplier);
    if (!existingSupplier) {
      return sendErrorResponse(res, 404, 'Supplier not found');
    }

    // Validate items and check stock (if applicable, though for purchase it's adding stock)
    for (const purchasedItem of items) {
      if (!purchasedItem.item || !purchasedItem.quantity || purchasedItem.purchasePrice === undefined) {
        return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and purchase price');
      }
      if (purchasedItem.quantity <= 0) {
        return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
      }
      if (purchasedItem.purchasePrice < 0) {
        return sendErrorResponse(res, 400, 'Purchase price cannot be negative');
      }
      const existingItem = await Item.findById(purchasedItem.item);
      if (!existingItem) {
        return sendErrorResponse(res, 404, `Item with ID ${purchasedItem.item} not found`);
      }
    }

    const purchase = new Purchase({
      supplier,
      items,
      notes,
    });

    await purchase.save();
    console.log('[PURCHASE] Purchase saved successfully:', purchase._id);

    // Update stock quantities
    for (const purchasedItem of items) {
      console.log(`[PURCHASE] Updating stock for item ${purchasedItem.item}, quantity: ${purchasedItem.quantity}`);
      
      const updatedItem = await Item.findByIdAndUpdate(
        purchasedItem.item, 
        { $inc: { quantityInStock: purchasedItem.quantity } },
        { new: true }
      );
      
      if (updatedItem) {
        console.log(`[PURCHASE] Stock updated for ${updatedItem.name}: ${updatedItem.quantityInStock}`);
      } else {
        console.error(`[PURCHASE] Failed to find item with ID: ${purchasedItem.item}`);
      }
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

  // Basic input validation
  if (!supplier || !items || items.length === 0) {
    return sendErrorResponse(res, 400, 'Supplier and at least one item are required');
  }

  try {
    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return sendErrorResponse(res, 404, 'Purchase not found');
    }

    // Validate supplier exists
    const existingSupplier = await Supplier.findById(supplier);
    if (!existingSupplier) {
      return sendErrorResponse(res, 404, 'Supplier not found');
    }

    // Validate items and check stock (if applicable, though for purchase it's adding stock)
    for (const purchasedItem of items) {
      if (!purchasedItem.item || !purchasedItem.quantity || purchasedItem.purchasePrice === undefined) {
        return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and purchase price');
      }
      if (purchasedItem.quantity <= 0) {
        return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
      }
      if (purchasedItem.purchasePrice < 0) {
        return sendErrorResponse(res, 400, 'Purchase price cannot be negative');
      }
      const existingItem = await Item.findById(purchasedItem.item);
      if (!existingItem) {
        return sendErrorResponse(res, 404, `Item with ID ${purchasedItem.item} not found`);
      }
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
      return sendErrorResponse(res, 404, 'Purchase not found');
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