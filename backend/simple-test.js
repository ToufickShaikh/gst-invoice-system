// Simple test to check reprint functionality
require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing reprint functionality...');
console.log('MongoDB URI:', process.env.MONGO_URI ? 'Found' : 'Not found');

// Set timeout
setTimeout(() => {
    console.error('✗ Test timed out');
    process.exit(1);
}, 30000);

async function testReprint() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        // Load models
        const Customer = require('./models/Customer');
        const Item = require('./models/Item');
        const Invoice = require('./models/Invoice');
        const pdfGenerator = require('./utils/pdfGenerator');

        // Find an existing invoice
        const invoice = await Invoice.findOne().populate('customer').populate('items.item');

        if (!invoice) {
            console.log('✗ No invoices found in database');
            console.log('This suggests the database is empty or connection is wrong');
            return;
        }

        console.log(`✓ Found invoice: ${invoice.invoiceNumber}`);
        console.log(`  Total Amount: ${invoice.totalAmount || invoice.grandTotal || 'undefined'}`);
        console.log(`  Customer: ${invoice.customer?.name || 'undefined'}`);
        console.log(`  Items: ${invoice.items?.length || 0}`);

        // Test PDF generation
        console.log('\n--- Generating PDF ---');
        const pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
        console.log(`✓ PDF generated: ${pdfPath}`);

        console.log('\n✓ Test completed successfully');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testReprint();
