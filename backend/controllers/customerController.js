const Customer = require('../models/Customer.js');
const Invoice = require('../models/Invoice.js');

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, errorDetails = null) => {
    console.error(`[ERROR] ${message}:`, errorDetails);
    res.status(statusCode).json({
        message,
        error: errorDetails ? errorDetails.message || errorDetails.toString() : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
};

// @desc    Get all customers or a single customer by ID
// @route   GET /api/customers
// @route   GET /api/customers/:id
// @access  Private
const getCustomers = async (req, res) => {
    try {
        if (req.params.id) {
            const customer = await Customer.findById(req.params.id);
            if (!customer) {
                return sendErrorResponse(res, 404, 'Customer not found');
            }
            res.json(customer);
        } else {
            const customers = await Customer.find(req.query).sort({ firmName: 1, name: 1 });
            res.json(customers);
        }
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to retrieve customers', error);
    }
};

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
    const { customerType, name, firmName, firmAddress, contact, email, gstNo, panNo, billingAddress, state, notes } = req.body;

    // Basic input validation based on customer type
    if (!customerType || !contact || !state) {
        return sendErrorResponse(res, 400, 'Customer type, contact, and state are required');
    }

    if (customerType === 'B2B') {
        if (!firmName || !gstNo) {
            return sendErrorResponse(res, 400, 'Firm name and GST number are required for B2B customers');
        }
    } else if (customerType === 'B2C') {
        if (!name) {
            return sendErrorResponse(res, 400, 'Customer name is required for B2C customers');
        }
    } else {
        return sendErrorResponse(res, 400, 'Invalid customer type');
    }

    try {
        console.log('[CUSTOMER] Create request received:', req.body);

        const customer = new Customer({
            customerType,
            name,
            firmName,
            firmAddress,
            contact,
            email,
            gstNo,
            panNo,
            billingAddress,
            state,
            notes,
        });
        await customer.save();

        console.log('[CUSTOMER] Customer created successfully:', customer._id);
        res.status(201).json(customer);
    } catch (error) {
        console.error('[CUSTOMER] Error creating customer:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            sendErrorResponse(res, 400, 'Validation failed', { messages: validationErrors, details: error.errors });
        } else if (error.code === 11000) {
            sendErrorResponse(res, 400, 'Customer with this GST number or name already exists', error);
        } else {
            sendErrorResponse(res, 500, 'Failed to create customer', error);
        }
    }
};

// @desc    Update an existing customer by ID
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
    try {
        console.log('[CUSTOMER] Update request for ID:', req.params.id);
        console.log('[CUSTOMER] Update data:', req.body);

        const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        if (!customer) {
            return sendErrorResponse(res, 404, 'Customer not found');
        }

        console.log('[CUSTOMER] Customer updated successfully:', customer._id);
        res.json(customer);
    } catch (error) {
        console.error('[CUSTOMER] Error updating customer:', error);
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            sendErrorResponse(res, 400, 'Validation failed', { messages: validationErrors, details: error.errors });
        } else if (error.code === 11000) {
            sendErrorResponse(res, 400, 'Customer with this GST number or name already exists', error);
        } else {
            sendErrorResponse(res, 500, 'Failed to update customer', error);
        }
    }
};

// @desc    Delete a customer by ID
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
    try {
        const customerId = req.params.id;
        console.log(`[CUSTOMER] Delete request for ID: ${customerId}`);

        // First, delete all invoices associated with this customer
        const invoicesDeleted = await Invoice.deleteMany({ customer: customerId });
        console.log(`[CUSTOMER] Deleted ${invoicesDeleted.deletedCount} invoices for customer ${customerId}`);

        // Then, delete the customer
        const deletedCustomer = await Customer.findByIdAndDelete(customerId);

        if (!deletedCustomer) {
            return sendErrorResponse(res, 404, 'Customer not found');
        }

        console.log('[CUSTOMER] Customer deleted successfully:', customerId);
        res.json({ message: 'Customer and associated invoices deleted successfully' });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to delete customer', error);
    }
};

module.exports = {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};