// Test HTML cleanup functionality
const fs = require('fs/promises');
const path = require('path');

// Mock invoice data for testing
const mockInvoiceData = {
    invoiceNumber: 'TEST-CLEANUP-01',
    customer: {
        firmName: 'Test Customer',
        state: '33-Tamil Nadu'
    },
    items: [{
        name: 'Test Item',
        rate: 100,
        quantity: 1,
        hsnCode: '1234'
    }],
    totalAmount: 100,
    grandTotal: 100,
    balance: 0,
    paidAmount: 100
};

async function testHtmlCleanup() {
    try {
        console.log('🧪 Testing HTML cleanup functionality...');

        // Import the PDF generator
        const { generateInvoicePDF } = require('./utils/pdfGenerator');

        // Generate an invoice (which will create HTML and schedule cleanup)
        const result = await generateInvoicePDF(mockInvoiceData);
        console.log('✅ Invoice generated:', result);

        // Check if HTML file exists immediately after generation
        const htmlPath = path.resolve(__dirname, 'invoices', `invoice-${mockInvoiceData.invoiceNumber}.html`);

        try {
            await fs.access(htmlPath);
            console.log('✅ HTML file exists immediately after generation');
        } catch (error) {
            console.log('❌ HTML file not found immediately after generation');
            return;
        }

        // Wait 35 seconds to verify cleanup
        console.log('⏳ Waiting 35 seconds to verify cleanup...');
        setTimeout(async () => {
            try {
                await fs.access(htmlPath);
                console.log('❌ HTML file still exists after 35 seconds - cleanup failed');
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('✅ HTML file successfully deleted after 30 seconds!');
                } else {
                    console.log('❓ Unexpected error checking file:', error.message);
                }
            }
        }, 35000);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testHtmlCleanup();
