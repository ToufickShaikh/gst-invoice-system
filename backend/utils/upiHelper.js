const qrcode = require('qrcode');

const generateUpiQr = async (upiId, amount) => {
    const upiLink = `upi://pay?pa=${upiId}&am=${amount}&cu=INR`;
    const qrCodeImage = await qrcode.toDataURL(upiLink);
    return { upiLink, qrCodeImage };
};

module.exports = { generateUpiQr };