import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: [
        {
            item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
            name: String,
            hsnCode: String,
            price: Number,
            taxSlab: Number,
            quantity: { type: Number, required: true },
            itemTotal: Number,
            discountAmount: Number,
            taxableAmount: Number,
            tax: mongoose.Schema.Types.Mixed,
            totalWithTax: Number
        },
    ],
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    invoiceDate: { type: Date, default: Date.now },
    shippingCharges: { type: Number, default: 0 },
    totalBeforeTax: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    paymentMethod: { type: String },
    billingType: { type: String },
});

// The only change is on this line
const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;