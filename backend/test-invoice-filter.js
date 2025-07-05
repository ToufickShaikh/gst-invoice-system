// Test invoice filtering by customer type
require('dotenv').config();
const mongoose = require('mongoose');

async function testInvoiceFiltering() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        const Invoice = require('./models/Invoice');
        const Customer = require('./models/Customer');

        console.log('\n--- Testing Invoice Filtering ---');

        // Get all invoices
        const allInvoices = await Invoice.find().populate('customer');
        console.log(`Total invoices in database: ${allInvoices.length}`);

        // Get all customers by type
        const b2bCustomers = await Customer.find({ customerType: 'B2B' });
        const b2cCustomers = await Customer.find({ customerType: 'B2C' });

        console.log(`B2B customers: ${b2bCustomers.length}`);
        console.log(`B2C customers: ${b2cCustomers.length}`);

        // Test B2B invoice filtering
        const b2bCustomerIds = b2bCustomers.map(c => c._id);
        const b2bInvoices = await Invoice.find({ customer: { $in: b2bCustomerIds } }).populate('customer');

        console.log(`B2B invoices found: ${b2bInvoices.length}`);

        // Test B2C invoice filtering  
        const b2cCustomerIds = b2cCustomers.map(c => c._id);
        const b2cInvoices = await Invoice.find({ customer: { $in: b2cCustomerIds } }).populate('customer');

        console.log(`B2C invoices found: ${b2cInvoices.length}`);

        // Check for invoices without customers
        const invoicesWithoutCustomers = await Invoice.find({ customer: null });
        console.log(`Invoices without customers: ${invoicesWithoutCustomers.length}`);

        // Display sample data
        if (allInvoices.length > 0) {
            console.log('\n--- Sample Invoice Data ---');
            allInvoices.slice(0, 3).forEach((inv, index) => {
                console.log(`Invoice ${index + 1}:`);
                console.log(`  - Number: ${inv.invoiceNumber}`);
                console.log(`  - Customer: ${inv.customer?.name || inv.customer?.firmName || 'No customer'}`);
                console.log(`  - Customer Type: ${inv.customer?.customerType || 'Unknown'}`);
                console.log(`  - Total: ${inv.totalAmount || inv.grandTotal || 0}`);
            });
        }

        console.log('\n✅ Invoice filtering test completed');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testInvoiceFiltering();
