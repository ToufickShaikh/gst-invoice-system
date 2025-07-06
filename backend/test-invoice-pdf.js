const { generateInvoicePDF } = require('./utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

// Mock invoice data for testing
const mockInvoiceData = {
    invoiceNumber: 'TEST-PDF-001',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    customer: {
        firmName: 'Test Customer Pvt Ltd',
        firmAddress: '123 Test Street, Test City, Test State - 123456',
        contact: '9876543210',
        email: 'test@testcustomer.com',
        gstNo: '29ABCDE1234F1Z5',
        state: '29-Karnataka'
    },
    items: [
        {
            name: 'Test Product 1',
            hsnCode: '1234',
            quantity: 2,
            rate: 100,
            taxSlab: 18,
            units: 'pieces'
        },
        {
            name: 'Test Product 2',
            hsnCode: '5678',
            quantity: 1,
            rate: 500,
            taxSlab: 18,
            units: 'pieces'
        }
    ],
    subTotal: 700,
    cgst: 63,
    sgst: 63,
    igst: 0,
    totalTax: 126,
    grandTotal: 826,
    totalAmount: 826,
    balance: 826,
    paidAmount: 0,
    paymentStatus: 'Pending'
};

async function testInvoicePdfGeneration() {
    console.log('🧪 Testing Invoice PDF Generation');
    console.log('=================================\n');

    try {
        console.log('📋 Mock Invoice Data:');
        console.log(`- Invoice Number: ${mockInvoiceData.invoiceNumber}`);
        console.log(`- Customer: ${mockInvoiceData.customer.firmName}`);
        console.log(`- Items: ${mockInvoiceData.items.length}`);
        console.log(`- Total Amount: ₹${mockInvoiceData.grandTotal}`);
        console.log('');

        console.log('🔧 Starting PDF generation...');
        const startTime = Date.now();

        const pdfPath = await generateInvoicePDF(mockInvoiceData);

        const endTime = Date.now();
        const timeTaken = endTime - startTime;

        console.log(`✅ PDF Generation completed in ${timeTaken}ms`);
        console.log(`📄 PDF Path: ${pdfPath}`);

        // Check if the file actually exists
        const fullPath = path.join(__dirname, 'invoices', `invoice-${mockInvoiceData.invoiceNumber}.pdf`);
        const htmlPath = path.join(__dirname, 'invoices', `invoice-${mockInvoiceData.invoiceNumber}.html`);

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`✅ PDF file created successfully`);
            console.log(`📊 File size: ${stats.size} bytes`);
            console.log(`📁 Full path: ${fullPath}`);

            // Test if it's a valid PDF by checking the header
            const buffer = fs.readFileSync(fullPath);
            const pdfHeader = buffer.toString('ascii', 0, 4);
            if (pdfHeader === '%PDF') {
                console.log('✅ File appears to be a valid PDF (correct header)');
            } else {
                console.log('❌ File does not appear to be a valid PDF (incorrect header)');
            }

        } else if (fs.existsSync(htmlPath)) {
            const stats = fs.statSync(htmlPath);
            console.log(`⚠️  HTML file created instead of PDF`);
            console.log(`📊 File size: ${stats.size} bytes`);
            console.log(`📁 Full path: ${htmlPath}`);
            console.log('🔍 This indicates PDF generation failed and fallback was used');

        } else {
            console.log('❌ No file was created (neither PDF nor HTML)');
        }

        return true;

    } catch (error) {
        console.error('❌ PDF generation test failed:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Test the PDF generation
testInvoicePdfGeneration()
    .then(success => {
        if (success) {
            console.log('\n🎉 Test completed! Check the results above.');
        } else {
            console.log('\n💥 Test failed. Check the error details above.');
        }

        console.log('\n📝 Next Steps:');
        console.log('1. If PDF was created successfully, the fix is working');
        console.log('2. If HTML was created, we need to investigate Puppeteer issues');
        console.log('3. If no file was created, there may be a fundamental issue');
        console.log('4. Test this in your actual application by creating an invoice');
    })
    .catch(error => {
        console.error('\n💥 Test execution error:', error);
    });
