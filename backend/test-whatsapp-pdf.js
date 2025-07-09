// Test WhatsApp PDF Generation Endpoint
const axios = require('axios').default;

const testWhatsAppPdfGeneration = async () => {
    console.log('🔍 Testing WhatsApp PDF Generation...');

    try {
        // First, test if the backend is running
        const baseUrl = 'http://localhost:3000';

        console.log('1. Testing backend health...');
        const healthResponse = await axios.get(`${baseUrl}/api/health`);
        console.log('✅ Backend is healthy:', healthResponse.data);

        console.log('2. Testing invoice list...');
        const invoicesResponse = await axios.get(`${baseUrl}/api/billing/invoices`);
        console.log(`✅ Found ${invoicesResponse.data.length} invoices`);

        if (invoicesResponse.data.length > 0) {
            const testInvoice = invoicesResponse.data[0];
            console.log(`3. Testing public PDF generation for invoice: ${testInvoice.invoiceNumber}`);

            // Test the public PDF endpoint (this is what WhatsApp uses)
            const pdfResponse = await axios.get(`${baseUrl}/api/billing/public/pdf/${testInvoice._id}`, {
                responseType: 'stream'
            });

            if (pdfResponse.status === 200) {
                console.log('✅ Public PDF endpoint is working');
                console.log('📄 Content-Type:', pdfResponse.headers['content-type']);
                console.log('📄 Content-Disposition:', pdfResponse.headers['content-disposition']);
                console.log('✅ WhatsApp PDF sharing should work properly');
            } else {
                console.log('❌ PDF generation failed with status:', pdfResponse.status);
            }
        } else {
            console.log('⚠️  No invoices found. Create an invoice first to test PDF generation.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Backend is not running. Start it with: npm start');
        } else if (error.response) {
            console.log('HTTP Error:', error.response.status, error.response.data);
        } else {
            console.log('Error details:', error);
        }
    }
};

// Run the test
testWhatsAppPdfGeneration();
