const { generateInvoicePDF } = require('./utils/pdfGenerator');

// Test data
const testInvoiceData = {
    invoiceNumber: 'TEST-001',
    customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+91-9876543210',
        address: '123 Test Street, Test City, Test State - 123456'
    },
    companyInfo: {
        name: 'Test Company Pvt Ltd',
        address: '456 Company Street, Business Park, Mumbai - 400001',
        gstin: 'TEST123456789GST',
        phone: '+91-1234567890',
        email: 'company@testcompany.com'
    },
    items: [
        {
            description: 'Web Development Services',
            quantity: 1,
            price: 50000,
            taxType: 'GST',
            taxRate: 18
        },
        {
            description: 'UI/UX Design Services',
            quantity: 1,
            price: 25000,
            taxType: 'GST',
            taxRate: 18
        }
    ],
    totals: {
        subtotal: 75000,
        totalTax: 13500,
        total: 88500
    },
    date: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    dueAmount: 88500
};

async function testPDFGeneration() {
    console.log('🚀 Testing Enhanced PDF Generation System');
    console.log('==========================================');
    
    try {
        console.log('📊 Test Invoice Data:');
        console.log(`   Invoice Number: ${testInvoiceData.invoiceNumber}`);
        console.log(`   Customer: ${testInvoiceData.customer.name}`);
        console.log(`   Total Amount: ₹${testInvoiceData.totals.total.toLocaleString()}`);
        console.log(`   Due Amount: ₹${testInvoiceData.dueAmount.toLocaleString()}`);
        console.log('');
        
        console.log('🔄 Starting PDF generation...');
        const startTime = Date.now();
        
        const result = await generateInvoicePDF(testInvoiceData);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('');
        console.log('✅ PDF Generation Result:');
        console.log(`   File Path: ${result}`);
        console.log(`   Generation Time: ${duration}ms`);
        
        // Check if it's a PDF or HTML file
        const isPdf = result.toLowerCase().endsWith('.pdf');
        const isHtml = result.toLowerCase().endsWith('.html');
        
        if (isPdf) {
            console.log('   📄 Type: PDF (Success!)');
            console.log('   🎉 PDF generation is working correctly!');
        } else if (isHtml) {
            console.log('   📄 Type: HTML (PDF libraries failed, using fallback)');
            console.log('   ⚠️  PDF generation fell back to HTML. Check server logs for PDF errors.');
        } else {
            console.log('   📄 Type: Unknown');
            console.log('   ❓ Unexpected file type generated.');
        }
        
        console.log('');
        console.log('💡 Next Steps:');
        if (isPdf) {
            console.log('   - PDF generation is working! You can now generate invoices as PDFs.');
            console.log('   - Test the frontend by creating a new invoice or reprinting an existing one.');
        } else {
            console.log('   - Check server logs for specific PDF generation errors.');
            console.log('   - HTML fallback is working, but PDF libraries may need additional setup.');
            console.log('   - Consider server environment requirements for PDF generation.');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ PDF Generation Failed:');
        console.log(`   Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('   - Check if all required packages are installed (html-pdf, html-pdf-node)');
        console.log('   - Verify server environment supports PDF generation');
        console.log('   - Check file permissions for invoice output directory');
    }
}

testPDFGeneration();
