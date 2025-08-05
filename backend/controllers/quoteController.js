const Quote = require('../models/Quote');
const SalesOrder = require('../models/SalesOrder'); // Import SalesOrder model

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

// @desc    Convert a quote to a sales order
// @route   POST /api/quotes/:id/convert-to-sales-order
// @access  Private
exports.convertToSalesOrder = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    // Create a new Sales Order from the Quote
    const salesOrder = new SalesOrder({
      customer: quote.customer,
      items: quote.items,
      notes: `Converted from Quote ID: ${quote._id}. ${quote.notes || ''}`.trim(),
      status: 'Pending', // Default status for new sales orders
    });

    await salesOrder.save();

    // Update the quote status to Accepted
    quote.status = 'Accepted';
    await quote.save();

    res.status(201).json(salesOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a quote
// @route   PUT /api/quotes/:id
// @access  Private
exports.updateQuote = async (req, res) => {
  const { id } = req.params;
  const { customer, items, notes, status } = req.body;

  try {
    const quote = await Quote.findById(id);

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    quote.customer = customer;
    quote.items = items;
    quote.notes = notes;
    quote.status = status;

    await quote.save();
    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a quote
// @route   DELETE /api/quotes/:id
// @access  Private
exports.deleteQuote = async (req, res) => {
  const { id } = req.params;

  try {
    const quote = await Quote.findById(id);

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    await quote.remove();
    res.json({ message: 'Quote removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
