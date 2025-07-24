// Test script to check if the edit invoice functionality works
const { billingAPI } = require('../src/api/billing');

async function testEditInvoiceAPI() {
    console.log('Testing Edit Invoice API...');

    try {
        // First, get all invoices to see what's available
        console.log('Fetching all invoices...');
        const invoices = await billingAPI.getInvoices();
        console.log('Available invoices:', invoices.data?.length || 0);

        if (invoices.data && invoices.data.length > 0) {
            const firstInvoice = invoices.data[0];
            console.log('Testing with invoice:', firstInvoice._id);

            // Test getting a specific invoice
            console.log('Fetching specific invoice...');
            const specificInvoice = await billingAPI.getInvoiceById(firstInvoice._id);
            console.log('Retrieved invoice:', specificInvoice);

            console.log('✅ Edit Invoice API test successful!');
        } else {
            console.log('⚠️ No invoices available to test with');
        }

    } catch (error) {
        console.error('❌ Edit Invoice API test failed:', error.message);
        console.error('Full error:', error);
    }
}

testEditInvoiceAPI();
