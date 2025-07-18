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
        console.log('[CUSTOMER] Create request received:', req.body);

        const customer = new Customer(req.body);
        await customer.save();

        console.log('[CUSTOMER] Customer created successfully:', customer._id);
        res.status(201).json(customer);
    } catch (error) {
        console.error('[CUSTOMER] Error creating customer:', error);
        console.error('[CUSTOMER] Request body was:', req.body);

        // Provide more specific error messages
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors,
                details: error.errors
            });
        }

        res.status(400).json({
            message: 'Error creating customer',
            error: error.message
        });
    }
};

// Update an existing customer by ID
const updateCustomer = async (req, res) => {
    try {
        console.log('[CUSTOMER] Update request for ID:', req.params.id);
        console.log('[CUSTOMER] Update data:', req.body);

        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        console.log('[CUSTOMER] Customer updated successfully:', customer._id);
        res.json(customer);
    } catch (error) {
        console.error('[CUSTOMER] Error updating customer:', error);
        console.error('[CUSTOMER] Request body was:', req.body);

        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors,
                details: error.errors
            });
        }

        res.status(400).json({
            message: 'Error updating customer',
            error: error.message
        });
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