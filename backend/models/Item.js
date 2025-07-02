const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hsnCode: { type: String, required: true },
    rate: { type: Number, required: true }, // Changed from price to rate for consistency
    taxSlab: { type: Number, required: true },
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;