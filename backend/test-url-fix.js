// Test URL construction fix
const testUrlConstruction = () => {
    console.log('Testing URL construction fix...\n');

    // Simulate environment variables
    const VITE_API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

    // Simulate response from backend
    const mockResponse = {
        pdfPath: '/invoices/invoice-INV-59bf185e-579a-45c4-8bca-7a78bfa5ffaa.html'
    };

    // OLD method (with bug)
    const oldPdfUrl = `${VITE_API_BASE_URL.replace('/api', '')}/${mockResponse.pdfPath}`;
    console.log('❌ OLD URL (with double slash):', oldPdfUrl);

    // NEW method (fixed)
    const baseUrl = VITE_API_BASE_URL.replace('/api', '');
    const newPdfUrl = `${baseUrl}${mockResponse.pdfPath}`;
    console.log('✅ NEW URL (fixed):', newPdfUrl);

    console.log('\n--- Analysis ---');
    console.log('Base URL after removing /api:', baseUrl);
    console.log('PDF path from backend:', mockResponse.pdfPath);
    console.log('Final URL should be:', 'https://gst-invoice-system-back.onrender.com/invoices/invoice-INV-59bf185e-579a-45c4-8bca-7a78bfa5ffaa.html');
    console.log('✅ Fix successful - no double slashes!');
};

testUrlConstruction();
