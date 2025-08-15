// Centralized company configuration
// Prefer environment variables, but provide sensible defaults for local dev

module.exports = {
  name: process.env.COMPANY_NAME || 'Shaikh Carpets And Mats',
  address: process.env.COMPANY_ADDRESS || '11 Trevelyan Basin Street,Sowcarpet,Chennai-600079',
  phone: process.env.COMPANY_PHONE || '9840844026/8939487096',
  email: process.env.COMPANY_EMAIL || 'shaikhcarpetsandmats@gmail.com',
  gstin: process.env.COMPANY_GSTIN || '33BVRPS2849Q2ZG',
  // Use format `CC-State Name` to be consistent with templates and tax helpers
  state: process.env.COMPANY_STATE || '33-Tamil Nadu',
  logoUrl: process.env.COMPANY_LOGO_URL || 'https://bri.ct.ws/include/logo.png',
  signatureImageUrl: process.env.SIGNATURE_IMAGE_URL || 'https://bri.ct.ws/include/sign.png',
  bank: {
    name: process.env.BANK_NAME || 'INDIAN OVERSEAS BANK, B RDWAY',
    account: process.env.BANK_ACCOUNT || '130702000003731',
    ifsc: process.env.BANK_IFSC || 'IOBA0001307',
    holder: process.env.BANK_HOLDER || 'Shaikh Carpets And Mats',
  },
  upi: {
    id: process.env.UPI_ID || '8939487096@upi',
    // Optional: If you host a static QR image, set this; otherwise we generate dynamically
    qrImageUrl: process.env.UPI_QR_IMAGE_URL || '',
  },
  // Editable Terms & Conditions shown in invoice preview and PDF
  terms: (
    process.env.COMPANY_TNC_JSON
      ? JSON.parse(process.env.COMPANY_TNC_JSON)
      : [
          'Payment is due within 30 days of invoice date.',
          'Late payments may incur additional charges as per company policy.',
          'Goods once sold will not be taken back or exchanged.',
          'All disputes are subject to local jurisdiction only.',
        ]
  ),
};
