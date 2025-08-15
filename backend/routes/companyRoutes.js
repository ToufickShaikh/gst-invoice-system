const express = require('express');
const router = express.Router();
const company = require('../config/company');

// Public endpoint to fetch company profile for client previews/metadata
router.get('/', (req, res) => {
  try {
    // Return only fields useful for client-side display
    const { name, address, phone, email, gstin, state, logoUrl, signatureImageUrl, bank, upi, terms } = company;
    res.json({ name, address, phone, email, gstin, state, logoUrl, signatureImageUrl, bank, upi, terms });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load company profile' });
  }
});

module.exports = router;
