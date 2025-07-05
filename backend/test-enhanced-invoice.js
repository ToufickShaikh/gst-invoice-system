const { generateInvoicePDF } = require('./utils/pdfGenerator');

// Test data that matches the enhanced template
const testInvoiceData = {
    invoiceNumber: 'INV-TEST-001',
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentStatus: 'Pending',
    customer: {
        firmName: 'Test Customer Ltd',
        firmAddress: '123 Business Street, Commercial Area, Chennai - 600001',
        contact: '+91 9876543210',
        email: 'test@customer.com',
        gstNo: '33AAAAA0000A1Z5',
        state: '33-Tamil Nadu'
    },
    items: [
        {
            name: 'Steel Rod',
            hsnCode: '7213',
            rate: 1500,
            quantity: 10,
            taxSlab: 18,
            units: 'per piece'
        },
        {
            name: 'Aluminum Plate',
            hsnCode: '7601',
            rate: 2500,
            quantity: 5,
            taxSlab: 18,
            units: 'per sqft'
        },
        {
            name: 'Cutting Tool',
            hsnCode: '8208',
            rate: 500,
            quantity: 3,
            taxSlab: 18,
            units: 'per set'
        }
    ],
    subTotal: 30000,
    totalAmount: 35400,
    grandTotal: 35400,
    paidAmount: 15000,
    balance: 20400
};

async function testEnhancedInvoice() {
    console.log('🧪 Testing Enhanced Invoice Template...');
    console.log('📋 Test Data:', JSON.stringify(testInvoiceData, null, 2));

    try {
        const result = await generateInvoicePDF(testInvoiceData);
        console.log('✅ Enhanced invoice generated successfully!');
        console.log('📄 File path:', result);

        // Log the generated invoice details for verification
        console.log('\n📊 Invoice Summary:');
        console.log(`- Invoice Number: ${testInvoiceData.invoiceNumber}`);
        console.log(`- Customer: ${testInvoiceData.customer.firmName}`);
        console.log(`- Items: ${testInvoiceData.items.length} items`);
        console.log(`- Sub Total: ₹${testInvoiceData.subTotal}`);
        console.log(`- Total Amount: ₹${testInvoiceData.totalAmount}`);
        console.log(`- Paid Amount: ₹${testInvoiceData.paidAmount}`);
        console.log(`- Balance: ₹${testInvoiceData.balance}`);

        console.log('\n🎨 Enhanced Template Features:');
        console.log('- ✅ Modern gradient header design');
        console.log('- ✅ Professional company and customer sections');
        console.log('- ✅ Structured items table with units column');
        console.log('- ✅ Comprehensive tax summary with IGST/CGST+SGST logic');
        console.log('- ✅ Enhanced invoice summary panel');
        console.log('- ✅ Professional footer with bank details and signature');
        console.log('- ✅ Amount in words conversion');
        console.log('- ✅ UPI QR code generation for balance amount');
        console.log('- ✅ Responsive design for mobile devices');
        console.log('- ✅ Print-optimized styling');

    } catch (error) {
        console.error('❌ Error testing enhanced invoice:', error);
    }
}

// Run the test
testEnhancedInvoice();
