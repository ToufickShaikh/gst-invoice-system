/**
 * Free WhatsApp Integration Utility
 * Uses WhatsApp URL scheme - completely free, no API needed
 */

// Format phone number for WhatsApp (remove spaces, dashes, and ensure proper format)
export const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return '';

    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if not present (assuming India +91)
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
};

// Generate comprehensive invoice message for WhatsApp
export const generateInvoiceMessage = (invoiceData, customerData, items, invoiceId) => {
    const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

    // Generate the public PDF URL that works without authentication
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://gst-invoice-system-back.onrender.com/api';
    const publicPdfUrl = `${baseUrl}/billing/public/pdf/${invoiceId}`;

    // Get current date in Indian format
    const today = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // Create a clear, bold headline for the PDF download link
    const pdfDownloadSection = `📥 *DOWNLOAD INVOICE PDF:*
👉 ${publicPdfUrl}
_(Tap link above to download)_`;

    // Create payment instructions if there's a balance due
    const paymentInstructions = invoiceData.balance > 0
        ? `\n\n💰 *PAYMENT INSTRUCTIONS:*
• Amount Due: ${formatCurrency(invoiceData.balance)}
• Please pay by UPI or bank transfer
• Reference your Invoice #${invoiceData.invoiceNumber || 'N/A'} in payment`
        : '\n\n✅ *Thank you for your payment!*';

    const message = `🧾 *INVOICE FROM ${customerData?.firmName ? customerData?.firmName.toUpperCase() : 'YOUR BUSINESS'}*
━━━━━━━━━━━━━━━━━━━━

Dear ${customerData.name || 'Customer'},

Your invoice #${invoiceData.invoiceNumber || 'N/A'} is ready.

${pdfDownloadSection}

📋 *INVOICE DETAILS:*
• Invoice #: *${invoiceData.invoiceNumber || 'N/A'}*
• Date: *${today}*
• Billed to: *${customerData.firmName || customerData.name || 'N/A'}*

━━━━━━━━━━━━━━━━━━━━
📦 *ITEMS SUMMARY:*

${items.map((item, index) =>
        `*${index + 1}. ${item.name || 'Item'}*
   • Qty: ${item.quantity} × Rate: ${formatCurrency(item.rate)}
   • Total: ${formatCurrency(item.itemTotal || (item.quantity * item.rate))}
   ${item.itemDiscount > 0 ? `   • Discount: -${formatCurrency(item.itemDiscount)}` : ''}
   ${item.tax?.total > 0 ? `   • Tax: ${formatCurrency(item.tax.total)}` : ''}`
    ).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
💵 *PAYMENT SUMMARY:*

• Subtotal: ${formatCurrency(invoiceData.totalBeforeTax)}
${invoiceData.discount > 0 ? `• Discount: -${formatCurrency(invoiceData.discount)}` : ''}
${invoiceData.totalTax > 0 ? `• GST: ${formatCurrency(invoiceData.totalTax)}` : ''}
${invoiceData.shippingCharges > 0 ? `• Shipping: ${formatCurrency(invoiceData.shippingCharges)}` : ''}

💰 *GRAND TOTAL: ${formatCurrency(invoiceData.grandTotal)}*

${invoiceData.paidAmount > 0 ? `💳 Paid (${invoiceData.paymentMethod || 'Payment'}): ${formatCurrency(invoiceData.paidAmount)}` : ''}
${invoiceData.balance > 0 ? `⚠️ *BALANCE DUE: ${formatCurrency(invoiceData.balance)}*` : '✅ *FULLY PAID*'}
${paymentInstructions}

━━━━━━━━━━━━━━━━━━━━

📲 *INVOICE PDF DOWNLOAD GUIDE:*
1️⃣ Tap the link at the top of this message
2️⃣ PDF will download automatically
3️⃣ Open from your Downloads folder
4️⃣ Save for your records

Thank you for your business! 🙏

Best regards,
${customerData?.firmName || 'Your Business Name'}

━━━━━━━━━━━━━━━━━━━━
Need help? Reply to this message.`;

    return message;
};

// Generate payment reminder message
export const generatePaymentReminderMessage = (invoiceData, customerData) => {
    const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

    const message = `⏰ *PAYMENT REMINDER*
━━━━━━━━━━━━━━━━━━━━

Dear ${customerData.firmName || customerData.name},

This is a friendly reminder for pending payment:

📄 Invoice #: ${invoiceData.invoiceNumber}
📅 Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString('en-IN')}
💰 Total Amount: ${formatCurrency(invoiceData.grandTotal)}
💳 Paid Amount: ${formatCurrency(invoiceData.paidAmount)}

⚠️ *OUTSTANDING: ${formatCurrency(invoiceData.balance)}*

Please make the payment at your earliest convenience.

Thank you! 🙏`;

    return message;
};

// Generate receipt confirmation message
export const generateReceiptMessage = (invoiceData, customerData, paidAmount) => {
    const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

    const message = `✅ *PAYMENT RECEIVED*
━━━━━━━━━━━━━━━━━━━━

Dear ${customerData.firmName || customerData.name},

Thank you for your payment!

📄 Invoice #: ${invoiceData.invoiceNumber}
💰 Payment Received: ${formatCurrency(paidAmount)}
💳 Payment Method: ${invoiceData.paymentMethod}
📅 Date: ${new Date().toLocaleDateString('en-IN')}

${invoiceData.balance <= 0 ? '✅ Invoice Fully Paid' : `Remaining Balance: ${formatCurrency(invoiceData.balance)}`}

We appreciate your business! 🙏`;

    return message;
};

// Send message via WhatsApp URL scheme
export const sendWhatsAppMessage = (phoneNumber, message) => {
    const formattedPhone = formatPhoneForWhatsApp(phoneNumber);

    if (!formattedPhone) {
        throw new Error('Invalid phone number');
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappURL, '_blank');

    return {
        success: true,
        url: whatsappURL,
        phone: formattedPhone
    };
};

// Send invoice via WhatsApp
export const sendInvoiceViaWhatsApp = (customerData, invoiceData, items, invoiceId) => {
    try {
        const message = generateInvoiceMessage(invoiceData, customerData, items, invoiceId);
        return sendWhatsAppMessage(customerData.contact, message);
    } catch (error) {
        console.error('WhatsApp send error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Send payment reminder via WhatsApp
export const sendPaymentReminderViaWhatsApp = (customerData, invoiceData) => {
    try {
        const message = generatePaymentReminderMessage(invoiceData, customerData);
        return sendWhatsAppMessage(customerData.contact, message);
    } catch (error) {
        console.error('WhatsApp reminder send error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};
