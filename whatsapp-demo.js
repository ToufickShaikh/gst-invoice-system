/**
 * WhatsApp Integration Demo Script
 * Run this to test the WhatsApp functionality
 */

// Demo data that would come from your invoice system
const demoCustomerData = {
    firmName: "ABC Enterprises",
    name: "John Doe",
    contact: "9876543210", // Indian phone number
    email: "john@abcenterprises.com"
};

const demoInvoiceData = {
    invoiceNumber: "INV-2025-001",
    grandTotal: 11800,
    totalBeforeTax: 10000,
    totalTax: 1800,
    discount: 200,
    shippingCharges: 0,
    paidAmount: 5000,
    balance: 6800,
    paymentMethod: "UPI",
    billingType: "B2B",
    invoiceDate: new Date().toISOString()
};

const demoItems = [
    {
        name: "Premium Widget",
        quantity: 2,
        rate: 2500,
        itemTotal: 5000,
        itemDiscount: 100,
        tax: { total: 900 }
    },
    {
        name: "Standard Service",
        quantity: 1,
        rate: 5000,
        itemTotal: 5000,
        itemDiscount: 100,
        tax: { total: 900 }
    }
];

const demoPdfUrl = "https://example.com/invoice-INV-2025-001.pdf";

// Import the WhatsApp helper (in your actual app)
// import { sendInvoiceViaWhatsApp } from './src/utils/whatsappHelper.js';

console.log("🚀 WhatsApp Integration Demo");
console.log("============================");

console.log("📱 Customer Phone:", demoCustomerData.contact);
console.log("🧾 Invoice Number:", demoInvoiceData.invoiceNumber);
console.log("💰 Grand Total:", demoInvoiceData.grandTotal);
console.log("⚠️ Balance Due:", demoInvoiceData.balance);

console.log("\n📝 Generated WhatsApp Message Preview:");
console.log("=====================================");

// Generate the message (this is what would be sent)
const message = `🧾 *INVOICE GENERATED*
━━━━━━━━━━━━━━━━━━━━

📋 *Invoice Details:*
📄 Invoice #: ${demoInvoiceData.invoiceNumber}
📅 Date: ${new Date().toLocaleDateString('en-IN')}
🏢 Customer: ${demoCustomerData.firmName}
📱 Contact: ${demoCustomerData.contact}

━━━━━━━━━━━━━━━━━━━━
📦 *ITEMS SUMMARY:*

${demoItems.map((item, index) =>
    `${index + 1}. ${item.name}
   📊 Qty: ${item.quantity} | Rate: ₹${item.rate.toLocaleString('en-IN')}
   💰 Amount: ₹${item.itemTotal.toLocaleString('en-IN')}
   🎯 Item Discount: -₹${item.itemDiscount.toLocaleString('en-IN')}
   📈 Tax: ₹${item.tax.total.toLocaleString('en-IN')}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
💵 *PAYMENT SUMMARY:*

📊 Subtotal: ₹${demoInvoiceData.totalBeforeTax.toLocaleString('en-IN')}
🎯 Global Discount: -₹${demoInvoiceData.discount.toLocaleString('en-IN')}
📈 Total Tax: ₹${demoInvoiceData.totalTax.toLocaleString('en-IN')}

💰 *GRAND TOTAL: ₹${demoInvoiceData.grandTotal.toLocaleString('en-IN')}*

💳 Paid (${demoInvoiceData.paymentMethod}): ₹${demoInvoiceData.paidAmount.toLocaleString('en-IN')}
⚠️ *BALANCE DUE: ₹${demoInvoiceData.balance.toLocaleString('en-IN')}*

━━━━━━━━━━━━━━━━━━━━
📄 *Download Invoice PDF:*
${demoPdfUrl}

Thank you for your business! 🙏`;

console.log(message);

console.log("\n🔗 WhatsApp URL that would be generated:");
console.log("========================================");

const formattedPhone = "91" + demoCustomerData.contact;
const encodedMessage = encodeURIComponent(message);
const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

console.log(whatsappURL);

console.log("\n✅ Integration Features:");
console.log("=======================");
console.log("📱 Automatic phone formatting (+91 for India)");
console.log("📄 Detailed invoice summary in message");
console.log("💰 Complete payment breakdown");
console.log("📊 Item-wise details with tax");
console.log("🔗 PDF download link included");
console.log("⚡ Instant WhatsApp opening");
console.log("💯 100% FREE - No API costs!");

console.log("\n🎯 How to Use:");
console.log("===============");
console.log("1. Generate invoice in your system");
console.log("2. Click 'Send via WhatsApp' button");
console.log("3. WhatsApp opens with pre-filled message");
console.log("4. Customer receives detailed invoice summary");
console.log("5. PDF link allows easy download");

console.log("\n🎉 Demo completed successfully!");
