const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hsnCode: { type: String, required: true },
    rate: { type: Number, required: true }, // Changed from price to rate for consistency
    taxSlab: { type: Number, required: true },
    units: {
        type: String,
        required: true,
        enum: [
            'per piece',
            'per ft',
            'per roll',
            'per sqft',
            'per box',
            'per set',
            'per gram',
            'per kg'
        ],
        default: 'per piece'
    },
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;