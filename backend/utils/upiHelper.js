const qrcode = require('qrcode');

const generateUpiQr = async (upiId, amount) => {
    // Create UPI link with or without amount
    let upiLink;
    if (amount && parseFloat(amount) > 0) {
        upiLink = `upi://pay?pa=${upiId}&am=${amount}&cu=INR`;
    } else {
        // Generate QR code without amount for zero balance or null amount
        upiLink = `upi://pay?pa=${upiId}&cu=INR`;
    }

    const qrCodeImage = await qrcode.toDataURL(upiLink);
    return { upiLink, qrCodeImage };
};

module.exports = { generateUpiQr };