// Controller for customer CRUD operations
const Customer = require('../models/Customer.js');
const Invoice = require('../models/Invoice.js');

// Get all customers (optionally filtered by query)
const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find(req.query);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new customer
const createCustomer = async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: 'Error creating customer' });
    }
};

// Update an existing customer by ID
const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(customer);
    } catch (error) {
        res.status(400).json({ message: 'Error updating customer' });
    }
};

// Delete a customer by ID
const deleteCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;
        // First, delete all invoices associated with this customer
        await Invoice.deleteMany({ customer: customerId });
        // Then, delete the customer
        await Customer.findByIdAndDelete(customerId);
        res.json({ message: 'Customer and associated invoices deleted successfully' });
    } catch (error) {
        console.error("Error deleting customer and invoices:", error);
        res.status(500).json({ message: 'Server error while deleting customer' });
    }
};

module.exports = {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};