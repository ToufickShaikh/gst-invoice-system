const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');

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
    const salesOrder = new SalesOrder({
      customer,
      items,
      notes,
    });

    await salesOrder.save();
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
