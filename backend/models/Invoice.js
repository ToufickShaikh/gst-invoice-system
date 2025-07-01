import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: [
        {
            item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
            quantity: { type: Number, required: true },
        },
    ],
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    invoiceDate: { type: Date, default: Date.now },
});

// The only change is on this line
const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;