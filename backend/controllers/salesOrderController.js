const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer'); // Import Customer model

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// @desc    Get all sales orders
// @route   GET /api/sales-orders
// @access  Private
exports.getSalesOrders = async (req, res) => {
  try {
    const salesOrders = await SalesOrder.find().populate('customer').populate('items.item');
    res.json(salesOrders);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to retrieve sales orders', error);
  }
};

// @desc    Create a sales order
// @route   POST /api/sales-orders
// @access  Private
exports.createSalesOrder = async (req, res) => {
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

    // Check stock availability and decrement
    for (const orderItem of items) {
      if (!orderItem.item || !orderItem.quantity || orderItem.rate === undefined) {
        return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and rate');
      }
      if (orderItem.quantity <= 0) {
        return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
      }
      if (orderItem.rate < 0) {
        return sendErrorResponse(res, 400, 'Rate cannot be negative');
      }

      const item = await Item.findById(orderItem.item);
      if (!item) {
        return sendErrorResponse(res, 404, `Item with ID ${orderItem.item} not found`);
      }
      if (item.quantityInStock < orderItem.quantity) {
        return sendErrorResponse(res, 400, `Insufficient stock for ${item.name}. Available: ${item.quantityInStock}, Requested: ${orderItem.quantity}`);
      }
    }

    const salesOrder = new SalesOrder({
      customer,
      items,
      notes,
    });

    await salesOrder.save();

    // Decrement stock quantities after successful save
    for (const orderItem of items) {
      await Item.findByIdAndUpdate(orderItem.item, {
        $inc: { quantityInStock: -orderItem.quantity },
      });
    }

    res.status(201).json(salesOrder);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to create sales order', error);
  }
};

// @desc    Convert a sales order to an invoice
// @route   POST /api/sales-orders/:id/convert-to-invoice
// @access  Private
exports.convertToInvoice = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);

    if (!salesOrder) {
      return sendErrorResponse(res, 404, 'Sales Order not found');
    }

    // Check if sales order is already converted or cancelled
    if (salesOrder.status === 'Completed' || salesOrder.status === 'Cancelled') {
      return sendErrorResponse(res, 400, `Sales Order is already ${salesOrder.status.toLowerCase()}`);
    }

    // Create invoice from sales order data
    const invoice = new Invoice({
      customer: salesOrder.customer,
      items: salesOrder.items,
      notes: salesOrder.notes,
      // You may want to add other fields from the sales order to the invoice
      // Ensure all required invoice fields are populated or handled
    });

    await invoice.save();

    salesOrder.status = 'Completed';
    await salesOrder.save();

    res.status(201).json(invoice);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to convert sales order to invoice', error);
  }
};


// @desc    Update a sales order
// @route   PUT /api/sales-orders/:id
// @access  Private
exports.updateSalesOrder = async (req, res) => {
  const { id } = req.params;
  const { customer, items, notes, status } = req.body;

  // Basic input validation
  if (!customer || !items || items.length === 0) {
    return sendErrorResponse(res, 400, 'Customer and at least one item are required');
  }

  try {
    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return sendErrorResponse(res, 404, 'Sales Order not found');
    }

    // Validate customer exists
    const existingCustomer = await Customer.findById(customer);
    if (!existingCustomer) {
      return sendErrorResponse(res, 404, 'Customer not found');
    }

    // Check stock availability for new items and revert old stock
    // Revert stock changes from the original sales order
    for (const originalItem of salesOrder.items) {
      await Item.findByIdAndUpdate(originalItem.item, {
        $inc: { quantityInStock: originalItem.quantity },
      });
    }

    // Check stock availability for new items and decrement
    for (const orderItem of items) {
      if (!orderItem.item || !orderItem.quantity || orderItem.rate === undefined) {
        return sendErrorResponse(res, 400, 'Each item must have an item ID, quantity, and rate');
      }
      if (orderItem.quantity <= 0) {
        return sendErrorResponse(res, 400, 'Quantity must be greater than zero');
      }
      if (orderItem.rate < 0) {
        return sendErrorResponse(res, 400, 'Rate cannot be negative');
      }

      const item = await Item.findById(orderItem.item);
      if (!item) {
        return sendErrorResponse(res, 404, `Item with ID ${orderItem.item} not found`);
      }
      if (item.quantityInStock < orderItem.quantity) {
        // Revert changes made so far before sending error
        for (const revertItem of items) {
            if (revertItem.item.toString() !== orderItem.item.toString()) {
                await Item.findByIdAndUpdate(revertItem.item, {
                    $inc: { quantityInStock: revertItem.quantity },
                });
            }
        }
        return sendErrorResponse(res, 400, `Insufficient stock for ${item.name}. Available: ${item.quantityInStock}, Requested: ${orderItem.quantity}`);
      }
    }

    // If status changes to Cancelled, revert stock (already handled above by reverting all and then re-applying)
    if (salesOrder.status !== 'Cancelled' && status === 'Cancelled') {
        // Stock already reverted, no need to do it again
    }

    salesOrder.customer = customer;
    salesOrder.items = items;
    salesOrder.notes = notes;
    salesOrder.status = status;

    await salesOrder.save();

    // Decrement stock quantities for new items after successful save
    for (const orderItem of items) {
        await Item.findByIdAndUpdate(orderItem.item, {
            $inc: { quantityInStock: -orderItem.quantity },
        });
    }

    res.json(salesOrder);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update sales order', error);
  }
};

// @desc    Delete a sales order
// @route   DELETE /api/sales-orders/:id
// @access  Private
exports.deleteSalesOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return sendErrorResponse(res, 404, 'Sales Order not found');
    }

    // Revert stock changes from the sales order
    for (const orderItem of salesOrder.items) {
      await Item.findByIdAndUpdate(orderItem.item, {
        $inc: { quantityInStock: orderItem.quantity },
      });
    }

    await salesOrder.deleteOne(); // Use deleteOne() for Mongoose 6+
    res.json({ message: 'Sales Order removed' });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete sales order', error);
  }
};