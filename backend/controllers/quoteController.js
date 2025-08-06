const Quote = require('../models/Quote');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer'); // Import Customer model
const Item = require('../models/Item'); // Import Item model

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private
exports.getQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find().populate('customer').populate('items.item');
    res.json(quotes);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve quotes', error);
  }
};

// @desc    Create a quote
// @route   POST /api/quotes
// @access  Private
exports.createQuote = async (req, res) => {
  const { customer, items, notes } = req.body;

  // Basic input validation
  if (!customer || !items || items.length === 0) {
    return sendErrorResponse(res, 400, 'Customer and at least one item are required');
  }

  try {
    // Validate customer exists
    const existingCustomer = await Customer.findById(customer);
    if (!existingCustomer) {
      return sendErrorResponse(res, 404, 'Customer not found');
    }

    // Validate items
    for (const quoteItem of items) {
      if (!quoteItem.item || !quoteItem.quantity || quoteItem.rate === undefined) {
        return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and rate');
      }
      if (quoteItem.quantity <= 0) {
        return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
      }
      if (quoteItem.rate < 0) {
        return sendErrorResponse(res, 400, 'Rate cannot be negative');
      }
      const existingItem = await Item.findById(quoteItem.item);
      if (!existingItem) {
        return sendErrorResponse(res, 404, `Item with ID ${quoteItem.item} not found`);
      }
    }

    const quote = new Quote({
      customer,
      items,
      notes,
    });

    await quote.save();
    res.status(201).json(quote);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to create quote', error);
  }
};

// @desc    Convert a quote to a sales order
// @route   POST /api/quotes/:id/convert-to-sales-order
// @access  Private
exports.convertToSalesOrder = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return sendErrorResponse(res, 404, 'Quote not found');
    }

    // Check if quote is already converted or rejected
    if (quote.status === 'Accepted' || quote.status === 'Rejected') {
      return sendErrorResponse(res, 400, `Quote is already ${quote.status.toLowerCase()}`);
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
    sendErrorResponse(res, 500, 'Failed to convert quote to sales order', error);
  }
};

// @desc    Update a quote
// @route   PUT /api/quotes/:id
// @access  Private
exports.updateQuote = async (req, res) => {
  const { id } = req.params;
  const { customer, items, notes, status } = req.body;

  // Basic input validation
  if (!customer || !items || items.length === 0) {
    return sendErrorResponse(res, 400, 'Customer and at least one item are required');
  }

  try {
    const quote = await Quote.findById(id);

    if (!quote) {
      return sendErrorResponse(res, 404, 'Quote not found');
    }

    // Validate customer exists
    const existingCustomer = await Customer.findById(customer);
    if (!existingCustomer) {
      return sendErrorResponse(res, 404, 'Customer not found');
    }

    // Validate items
    for (const quoteItem of items) {
      if (!quoteItem.item || !quoteItem.quantity || quoteItem.rate === undefined) {
        return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and rate');
      }
      if (quoteItem.quantity <= 0) {
        return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
      }
      if (quoteItem.rate < 0) {
        return sendErrorResponse(res, 400, 'Rate cannot be negative');
      }
      const existingItem = await Item.findById(quoteItem.item);
      if (!existingItem) {
        return sendErrorResponse(res, 404, `Item with ID ${quoteItem.item} not found`);
      }
    }

    quote.customer = customer;
    quote.items = items;
    quote.notes = notes;
    quote.status = status;

    await quote.save();
    res.json(quote);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update quote', error);
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
      return sendErrorResponse(res, 404, 'Quote not found');
    }

    await quote.deleteOne(); // Use deleteOne() for Mongoose 6+
    res.json({ message: 'Quote removed' });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete quote', error);
  }
};