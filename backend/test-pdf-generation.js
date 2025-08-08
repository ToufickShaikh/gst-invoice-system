const { generateInvoicePDF } = require('./utils/pdfGenerator');

async function testPDFGeneration() {
    try {
        console.log('🧪 Testing PDF generation with improved fonts...');

        // Sample invoice data for testing
        const testInvoiceData = {
            invoiceNumber: 'TEST-001',
            invoiceDate: new Date().toLocaleDateString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            customer: {
                name: 'Test Customer Pvt Ltd',
                email: 'test@customer.com',
                phone: '+91 9876543210',
                address: '123 Business Street, Commercial Area',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                gstin: '27ABCDE1234F1Z5'
            },
            items: [
                {
                    name: 'Premium Product A',
                    hsnCode: '8504',
                    quantity: 2,
                    rate: 1250.00,
                    taxSlab: 18,
                    units: 'pieces'
                },
                {
                    name: 'Standard Service B',
                    hsnCode: '9983',
                    quantity: 1,
                    rate: 850.00,
                    taxSlab: 18,
                    units: 'hours'
                },
                {
                    name: 'Basic Item C',
                    hsnCode: '2205',
                    quantity: 5,
                    rate: 200.00,
                    taxSlab: 12,
                    units: 'units'
                }
            ],
            subTotal: 4350.00,
            totalAmount: 5133.00,
            grandTotal: 5133.00,
            notes: 'Thank you for your business! This is a test invoice to verify the improved PDF formatting with larger, more readable fonts.'
        };

        // Generate PDF
        const pdfPath = await generateInvoicePDF(testInvoiceData);
        console.log('✅ PDF generated successfully!');
        console.log(`📄 PDF saved at: ${pdfPath}`);

        // Check if file exists and get size
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(__dirname, pdfPath);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`📊 PDF file size: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log('✅ PDF generation test completed successfully!');
        } else {
            console.log('❌ PDF file not found at expected location');
        }

    } catch (error) {
        console.error('❌ Error testing PDF generation:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testPDFGeneration();
