const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    customerType: { type: String, enum: ['B2B', 'B2C'], required: true },
    firmName: { type: String },
    gstNo: { type: String },
    firmAddress: { type: String },
    name: { type: String },
    contact: { type: String },
    state: { type: String, required: true }, // Added state for tax calculation
});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;