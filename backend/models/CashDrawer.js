const mongoose = require('mongoose');

const denominationSchema = new mongoose.Schema({
  d500: { type: Number, default: 0 },
  d200: { type: Number, default: 0 },
  d100: { type: Number, default: 0 },
  d50: { type: Number, default: 0 },
  d20: { type: Number, default: 0 },
  d10: { type: Number, default: 0 },
  d5: { type: Number, default: 0 },
  d2: { type: Number, default: 0 },
  d1: { type: Number, default: 0 },
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['sale', 'adjust-add', 'adjust-remove'], required: true },
  direction: { type: String, enum: ['credit','debit'], required: true },
  method: { type: String, default: 'Cash' },
  amount: { type: Number, required: true },
  denominations: { type: denominationSchema, default: () => ({}) },
  reason: { type: String },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  beforeTotal: { type: Number },
  afterTotal: { type: Number },
  beforeDenoms: { type: denominationSchema },
  afterDenoms: { type: denominationSchema },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const cashDrawerSchema = new mongoose.Schema({
  denominations: { type: denominationSchema, default: () => ({}) },
  totalCash: { type: Number, default: 0 },
  transactions: { type: [transactionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('CashDrawer', cashDrawerSchema);
