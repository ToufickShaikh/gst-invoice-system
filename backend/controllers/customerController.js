// Controller for customer CRUD operations
import Customer from '../models/Customer.js';

// Get all customers (optionally filtered by query)
export const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find(req.query);
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Create a new customer
export const createCustomer = async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: 'Error creating customer' });
    }
};

// Update an existing customer by ID
export const updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(customer);
    } catch (error) {
        res.status(400).json({ message: 'Error updating customer' });
    }
};

// Delete a customer by ID
export const deleteCustomer = async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Customer deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};