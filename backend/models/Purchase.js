const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  items: [
    {
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      purchasePrice: {
        type: Number,
        required: true,
      },
    },
  ],
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
});

module.exports = mongoose.model('Purchase', purchaseSchema);
