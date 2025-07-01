import qrcode from 'qrcode';

export const generateUpiQr = async (upiId, amount) => {
    const upiLink = `upi://pay?pa=${upiId}&am=${amount}&cu=INR`;
    const qrCodeImage = await qrcode.toDataURL(upiLink);
    return { upiLink, qrCodeImage };
};