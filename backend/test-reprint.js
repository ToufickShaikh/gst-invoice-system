// Test script to simulate reprint functionality
require('dotenv').config();
const mongoose = require('mongoose');

// Set a timeout for the entire test
const testTimeout = setTimeout(() => {
    console.error('✗ Test timed out after 30 seconds');
    process.exit(1);
}, 30000);

console.log('MongoDB URI:', process.env.MONGO_URI || 'not found');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gst-invoice-system')
    .then(() => {
        console.log('✓ Connected to MongoDB');
        runTest();
    })
    .catch(err => {
        console.error('✗ MongoDB connection failed:', err);
        process.exit(1);
    });

async function testInvoice() {
    const Invoice = require('./models/Invoice');
    const Customer = require('./models/Customer');
    const Item = require('./models/Item');
    const pdfGenerator = require('./utils/pdfGenerator');
    try {
        console.log('\n=== Testing Reprint Functionality ===');

        // Find a random invoice to test with
        const invoice = await Invoice.findOne().populate('customer').populate('items.item');

        if (!invoice) {
            console.log('✗ No invoices found in database');
            console.log('Creating a test invoice...');

            // Create test data if no invoice exists
            const testCustomer = new Customer({
                name: 'Test Customer',
                firmName: 'Test Firm',
                firmAddress: 'Test Address, Test City',
                contact: '9999999999',
                gstNo: '33TESTGST123Z1',
                state: '33-Tamil Nadu'
            });
            await testCustomer.save();

            const testItem = new Item({
                name: 'Test Item',
                hsnCode: '1234',
                rate: 100,
                taxSlab: 18
            });
            await testItem.save();

            const testInvoice = new Invoice({
                invoiceNumber: 'TEST-001',
                customer: testCustomer._id,
                items: [{
                    item: testItem._id,
                    quantity: 2
                }],
                subTotal: 200,
                cgst: 18,
                sgst: 18,
                totalAmount: 236,
                grandTotal: 236,
                totalTax: 36,
                balance: 236,
                paidAmount: 0
            });
            await testInvoice.save();

            console.log('✓ Test invoice created');
            return testInvoice._id;
        }

        console.log(`✓ Found invoice: ${invoice.invoiceNumber}`);
        console.log(`  Customer: ${invoice.customer?.name || 'Unknown'}`);
        console.log(`  Items: ${invoice.items?.length || 0}`);
        console.log(`  Total: ${invoice.totalAmount || invoice.grandTotal || 0}`);

        // Test PDF generation
        console.log('\n--- Testing PDF Generation ---');
        const pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
        console.log(`✓ PDF generated successfully: ${pdfPath}`);

        return invoice._id;

    } catch (error) {
        console.error('✗ Test failed:', error);
        console.error('Stack:', error.stack);
        throw error;
    }
}

// This function will be called after MongoDB connection
function runTest() {
    return testInvoice();
}

// Run test - this will be called once MongoDB connects
runTest()
    .then((invoiceId) => {
        clearTimeout(testTimeout);
        console.log(`\n✓ Test completed successfully for invoice: ${invoiceId}`);
        process.exit(0);
    })
    .catch((error) => {
        clearTimeout(testTimeout);
        console.error('\n✗ Test failed:', error.message);
        process.exit(1);
    });
