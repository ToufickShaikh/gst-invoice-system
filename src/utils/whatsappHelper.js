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
export const generateInvoiceMessage = (invoiceData, customerData, items, pdfUrl) => {
    const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

    const message = `🧾 *INVOICE GENERATED*
━━━━━━━━━━━━━━━━━━━━

📋 *Invoice Details:*
📄 Invoice #: ${invoiceData.invoiceNumber || 'N/A'}
📅 Date: ${new Date().toLocaleDateString('en-IN')}
🏢 Customer: ${customerData.firmName || customerData.name || 'N/A'}
📱 Contact: ${customerData.contact || 'N/A'}

━━━━━━━━━━━━━━━━━━━━
📦 *ITEMS SUMMARY:*

${items.map((item, index) =>
        `${index + 1}. ${item.name || 'Item'}
   📊 Qty: ${item.quantity} | Rate: ${formatCurrency(item.rate)}
   💰 Amount: ${formatCurrency(item.itemTotal || (item.quantity * item.rate))}
   ${item.itemDiscount > 0 ? `   🎯 Item Discount: -${formatCurrency(item.itemDiscount)}` : ''}
   ${item.tax?.total > 0 ? `   📈 Tax: ${formatCurrency(item.tax.total)}` : ''}`
    ).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
💵 *PAYMENT SUMMARY:*

📊 Subtotal: ${formatCurrency(invoiceData.totalBeforeTax)}
${invoiceData.discount > 0 ? `🎯 Global Discount: -${formatCurrency(invoiceData.discount)}` : ''}
📈 Total Tax: ${formatCurrency(invoiceData.totalTax)}
${invoiceData.shippingCharges > 0 ? `🚚 Shipping: ${formatCurrency(invoiceData.shippingCharges)}` : ''}

💰 *GRAND TOTAL: ${formatCurrency(invoiceData.grandTotal)}*

${invoiceData.paidAmount > 0 ? `💳 Paid (${invoiceData.paymentMethod}): ${formatCurrency(invoiceData.paidAmount)}` : ''}
${invoiceData.balance > 0 ? `⚠️ *BALANCE DUE: ${formatCurrency(invoiceData.balance)}*` : '✅ *FULLY PAID*'}

━━━━━━━━━━━━━━━━━━━━
📄 *DOWNLOAD OFFICIAL INVOICE PDF:*

👆 *Click this link to download:*
${pdfUrl}

📱 *How to Download:*
1️⃣ Tap the link above
2️⃣ PDF will open in your browser
3️⃣ Use "Download" or "Share" button
4️⃣ Save to your device

💡 *Tip:* Long-press the link and select "Copy" to share with others

Thank you for your business! 🙏

━━━━━━━━━━━━━━━━━━━━
🏢 *GST Invoice System*
📧 Professional invoicing made easy`;

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
export const sendInvoiceViaWhatsApp = (customerData, invoiceData, items, pdfUrl) => {
    try {
        const message = generateInvoiceMessage(invoiceData, customerData, items, pdfUrl);
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
