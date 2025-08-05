const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    contactPerson: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/, 'Please fill a valid email address'],
    },
    phone: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    gstin: {
        type: String,
        trim: true,
        uppercase: true,
        // Basic GSTIN validation (15 alphanumeric characters)
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please fill a valid GSTIN'],
    },
    panNo: {
        type: String,
        trim: true,
        uppercase: true,
        // Basic PAN validation (10 alphanumeric characters)
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please fill a valid PAN number'],
    },
    notes: {
        type: String,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt field on save
supplierSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
