const Quote = require('../models/Quote');

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private
exports.getQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find().populate('customer').populate('items.item');
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a quote
// @route   POST /api/quotes
// @access  Private
exports.createQuote = async (req, res) => {
  const { customer, items, notes } = req.body;

  try {
    const quote = new Quote({
      customer,
      items,
      notes,
    });

    await quote.save();
    res.status(201).json(quote);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
