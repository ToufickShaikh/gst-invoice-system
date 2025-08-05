const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Item = require('../models/Item'); // Import Item model

// @desc    Get all sales orders
// @route   GET /api/sales-orders
// @access  Private
exports.getSalesOrders = async (req, res) => {
  try {
    const salesOrders = await SalesOrder.find().populate('customer').populate('items.item');
    res.json(salesOrders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a sales order
// @route   POST /api/sales-orders
// @access  Private
exports.createSalesOrder = async (req, res) => {
  const { customer, items, notes } = req.body;

  try {
    // Check stock availability and decrement
    for (const orderItem of items) {
      const item = await Item.findById(orderItem.item);
      if (!item) {
        return res.status(404).json({ message: `Item with ID ${orderItem.item} not found` });
      }
      if (item.quantityInStock < orderItem.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.name}. Available: ${item.quantityInStock}, Requested: ${orderItem.quantity}` });
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
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Convert a sales order to an invoice
// @route   POST /api/sales-orders/:id/convert-to-invoice
// @access  Private
exports.convertToInvoice = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);

    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    const invoice = new Invoice({
      customer: salesOrder.customer,
      items: salesOrder.items,
      notes: salesOrder.notes,
      // You may want to add other fields from the sales order to the invoice
    });

    await invoice.save();

    salesOrder.status = 'Completed';
    await salesOrder.save();

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Update a sales order
// @route   PUT /api/sales-orders/:id
// @access  Private
exports.updateSalesOrder = async (req, res) => {
  const { id } = req.params;
  const { customer, items, notes, status } = req.body;

  try {
    const salesOrder = await SalesOrder.findById(id);

    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // If status changes to Cancelled, revert stock
    if (salesOrder.status !== 'Cancelled' && status === 'Cancelled') {
      for (const orderItem of salesOrder.items) {
        await Item.findByIdAndUpdate(orderItem.item, {
          $inc: { quantityInStock: orderItem.quantity },
        });
      }
    }

    salesOrder.customer = customer;
    salesOrder.items = items;
    salesOrder.notes = notes;
    salesOrder.status = status;

    await salesOrder.save();
    res.json(salesOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
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
      return res.status(404).json({ message: 'Sales Order not found' });
    }

    // Revert stock changes
    for (const orderItem of salesOrder.items) {
      await Item.findByIdAndUpdate(orderItem.item, {
        $inc: { quantityInStock: orderItem.quantity },
      });
    }

    await salesOrder.remove();
    res.json({ message: 'Sales Order removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
