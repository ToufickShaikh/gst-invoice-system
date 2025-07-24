const { generateInvoicePDF } = require('./utils/pdfGenerator');

const testInvoiceData = {
    invoiceNumber: 'TEST-001',
    customer: {
        name: 'Test Customer',
        email: 'test@test.com',
        phone: '1234567890',
        address: '123 Test Street'
    },
    companyInfo: {
        name: 'Test Company',
        address: '456 Company Street',
        gstin: 'TEST123456789',
        phone: '9876543210',
        email: 'company@test.com'
    },
    items: [
        {
            description: 'Test Item',
            quantity: 1,
            price: 100,
            taxType: 'GST',
            taxRate: 18
        }
    ],
    totals: {
        subtotal: 100,
        totalTax: 18,
        total: 118
    },
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueAmount: 118
};

async function testPDFGeneration() {
    console.log('Testing PDF generation with sample invoice data...');

    try {
        const result = await generateInvoicePDF(testInvoiceData);
        console.log('SUCCESS: PDF generated at:', result);
    } catch (error) {
        console.error('ERROR: PDF generation failed:', error.message);
        console.error('Full error:', error);
    }
}

testPDFGeneration();
