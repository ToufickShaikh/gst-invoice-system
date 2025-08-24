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
    grandTotal: { type: Number }, // Total amount including taxes
    totalTax: { type: Number, default: 0 }, // Total tax amount
    balance: { type: Number, default: 0 }, // Remaining balance after payments
    paidAmount: { type: Number, default: 0 },
    invoiceDate: { type: Date, default: Date.now },
    shippingCharges: { type: Number, default: 0 },
    paymentMethod: { type: String },
    pdfPath: { type: String }, // Path to generated PDF
    // Portal access fields
    portalToken: { type: String },
    portalTokenExpires: { type: Date },
    guestName: { type: String },
    // Export/SEZ info for GSTR-1 exp section
    exportInfo: {
        isExport: { type: Boolean, default: false },
        exportType: { type: String, enum: ['SEZ', 'EXPORT', ''], default: '' }, // SEZ or Overseas Export
        withTax: { type: Boolean, default: false }, // true => WPAY, false => WOPAY
        shippingBillNo: { type: String, default: '' },
        shippingBillDate: { type: Date },
        portCode: { type: String, default: '' },
    }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;