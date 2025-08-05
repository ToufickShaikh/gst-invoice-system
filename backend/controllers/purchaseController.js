const Purchase = require('../models/Purchase');
const Item = require('../models/Item');

// @desc    Get all purchase bills
// @route   GET /api/purchases
// @access  Private
exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().populate('items.item');
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
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
    res.status(500).json({ message: 'Server Error' });
  }
};
