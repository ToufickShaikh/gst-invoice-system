const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    tenantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tenant', 
        required: true,
        index: true 
    },
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
    // Portal access fields
    portalToken: { type: String },
    portalTokenExpires: { type: Date },
});

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;