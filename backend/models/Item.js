import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hsnCode: { type: String, required: true },
    price: { type: Number, required: true },
    taxSlab: { type: Number, required: true },
});

// The only change is on this line
const Item = mongoose.model('Item', itemSchema);
export default Item;