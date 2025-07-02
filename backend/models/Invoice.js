const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: [
        {
            item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
            name: String,
            hsnCode: String,
            rate: Number, // Changed from price to rate
            taxSlab: Number,
            quantity: { type: Number, required: true },
            // The following fields will be calculated and are not stored directly
            // They can be populated at runtime if needed
        },
    ],
    subTotal: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    invoiceDate: { type: Date, default: Date.now },
    shippingCharges: { type: Number, default: 0 },
    paymentMethod: { type: String },
    // Removed redundant/calculable fields like grandTotal, balance, etc.
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;