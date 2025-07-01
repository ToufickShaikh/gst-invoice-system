import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    customerType: { type: String, enum: ['B2B', 'B2C'], required: true },
    firmName: { type: String },
    gstNo: { type: String },
    firmAddress: { type: String },
    name: { type: String },
    contact: { type: String },
});

// The only change is on this line
const Customer = mongoose.model('Customer', customerSchema);
export default Customer;