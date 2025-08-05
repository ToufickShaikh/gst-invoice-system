const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    customerType: { type: String, enum: ['B2B', 'B2C'], required: true },
    firmName: { type: String },
    gstNo: { type: String },
    firmAddress: { type: String }, // Registered address for B2B
    name: { type: String },
    contact: { type: String },
    email: { type: String },
    panNo: { type: String },
    billingAddress: { type: String }, // General billing address
    state: { type: String, required: true }, // Added state for tax calculation
    notes: { type: String },
});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;