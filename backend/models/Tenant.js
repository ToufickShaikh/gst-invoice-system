const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  
  companyDetails: {
    legalName: String,
    tradeName: String,
    gstin: String,
    pan: String,
    
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    },
    
    phone: String,
    email: String,
    website: String,
    
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branch: String
    },
    
    logo: String,
    signature: String,
    
    invoiceSettings: {
      prefix: { type: String, default: 'INV' },
      startingNumber: { type: Number, default: 1 },
      terms: String,
      notes: String
    }
  },
  
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', tenantSchema);