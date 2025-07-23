// Test script to check backend connectivity
const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

async function testBackendConnection() {
    console.log('🔍 Testing backend connection...');
    console.log('API Base URL:', API_BASE_URL);

    try {
        // Test 1: Health check
        console.log('\n📡 Test 1: Health check...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData);

        // Test 2: Get invoices
        console.log('\n📋 Test 2: Get invoices...');
        const invoicesResponse = await fetch(`${API_BASE_URL}/billing/invoices`);
        const invoicesData = await invoicesResponse.json();
        console.log('✅ Invoices count:', invoicesData.length);

        if (invoicesData.length > 0) {
            const firstInvoice = invoicesData[0];
            console.log('First invoice ID:', firstInvoice._id);
            console.log('First invoice number:', firstInvoice.invoiceNumber);

            // Test 3: Reprint first invoice
            console.log('\n🖨️ Test 3: Reprint invoice...');
            const reprintResponse = await fetch(`${API_BASE_URL}/billing/invoices/${firstInvoice._id}/reprint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (reprintResponse.ok) {
                const reprintData = await reprintResponse.json();
                console.log('✅ Reprint response:', reprintData);

                if (reprintData.pdfPath) {
                    // Test 4: Check if PDF is accessible
                    console.log('\n📄 Test 4: Check PDF accessibility...');
                    const pdfUrl = `https://gst-invoice-system-back.onrender.com${reprintData.pdfPath}`;
                    console.log('PDF URL:', pdfUrl);

                    const pdfResponse = await fetch(pdfUrl);
                    console.log('PDF status:', pdfResponse.status);
                    console.log('PDF headers:', Object.fromEntries(pdfResponse.headers.entries()));

                    if (pdfResponse.ok) {
                        console.log('✅ PDF is accessible!');
                    } else {
                        console.log('❌ PDF not accessible');
                    }
                }
            } else {
                console.log('❌ Reprint failed:', reprintResponse.status, reprintResponse.statusText);
                const errorText = await reprintResponse.text();
                console.log('Error details:', errorText);
            }
        }

    } catch (error) {
        console.error('❌ Backend connection test failed:', error);
    }
}

// Run the test
testBackendConnection();
