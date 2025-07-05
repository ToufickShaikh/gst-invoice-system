// Test the new invoice number format
require('dotenv').config();
const mongoose = require('mongoose');

async function testInvoiceNumberFormat() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        const Invoice = require('./models/Invoice');
        const Customer = require('./models/Customer');

        console.log('\n--- Testing Invoice Number Generation ---');

        // Helper function (copied from controller)
        async function generateInvoiceNumber(customerType) {
            try {
                const lastInvoice = await Invoice.findOne({
                    invoiceNumber: { $regex: `^${customerType}-` }
                }).sort({ invoiceNumber: -1 });

                let nextNumber = 1;

                if (lastInvoice) {
                    const match = lastInvoice.invoiceNumber.match(new RegExp(`^${customerType}-(\\d+)$`));
                    if (match) {
                        nextNumber = parseInt(match[1]) + 1;
                    }
                }

                const formattedNumber = nextNumber.toString().padStart(2, '0');
                return `${customerType}-${formattedNumber}`;
            } catch (error) {
                console.error('[ERROR] Failed to generate invoice number:', error);
                return `${customerType}-ERROR`;
            }
        }

        // Test B2B invoice number generation
        console.log('\n1. Testing B2B invoice numbers:');
        const b2bNumber1 = await generateInvoiceNumber('B2B');
        console.log(`   First B2B invoice: ${b2bNumber1}`);

        const b2bNumber2 = await generateInvoiceNumber('B2B');
        console.log(`   Second B2B invoice: ${b2bNumber2}`);

        // Test B2C invoice number generation
        console.log('\n2. Testing B2C invoice numbers:');
        const b2cNumber1 = await generateInvoiceNumber('B2C');
        console.log(`   First B2C invoice: ${b2cNumber1}`);

        const b2cNumber2 = await generateInvoiceNumber('B2C');
        console.log(`   Second B2C invoice: ${b2cNumber2}`);

        // Check existing invoices to see current highest numbers
        console.log('\n3. Checking existing invoices:');
        const existingB2B = await Invoice.find({ invoiceNumber: { $regex: '^B2B-' } }).sort({ invoiceNumber: 1 });
        const existingB2C = await Invoice.find({ invoiceNumber: { $regex: '^B2C-' } }).sort({ invoiceNumber: 1 });

        console.log(`   Existing B2B invoices: ${existingB2B.map(inv => inv.invoiceNumber).join(', ') || 'None'}`);
        console.log(`   Existing B2C invoices: ${existingB2C.map(inv => inv.invoiceNumber).join(', ') || 'None'}`);

        // Check old format invoices
        const oldFormatInvoices = await Invoice.find({ invoiceNumber: { $regex: '^INV-' } });
        console.log(`   Old format invoices: ${oldFormatInvoices.length}`);

        console.log('\n✅ Invoice number format test completed');
        console.log('\n📋 Expected behavior:');
        console.log('   - B2B invoices: B2B-01, B2B-02, B2B-03...');
        console.log('   - B2C invoices: B2C-01, B2C-02, B2C-03...');
        console.log('   - Sequential numbering per customer type');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testInvoiceNumberFormat();
