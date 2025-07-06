/**
 * Browser-based test for PDF download functionality
 * Open this file in a browser to test the actual download behavior
 */

// This script tests the PDF download in a real browser environment
function testPdfDownload() {
    console.log('Starting PDF download test...');
    
    // Mock API response for testing
    const mockApiResponse = {
        pdfPath: '/invoices/invoice-TEST-001.pdf',
        message: 'Invoice reprinted successfully'
    };
    
    // Your actual download code (paste from downloadHelper.js)
    const downloadInvoicePdf = (pdfPath, invoiceId, baseUrl) => {
        try {
            if (!pdfPath) {
                console.error('PDF path is missing');
                return false;
            }

            // Clean base URL by removing '/api' if present and ensuring it doesn't end with a slash
            let cleanBaseUrl = baseUrl ? baseUrl.replace('/api', '') : '';
            if (cleanBaseUrl.endsWith('/')) {
                cleanBaseUrl = cleanBaseUrl.slice(0, -1);
            }
            
            // Make sure pdfPath starts with a slash
            const normalizedPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`;

            // Construct the full URL to the PDF/HTML file
            const fileUrl = `${cleanBaseUrl}${normalizedPath}`;
            console.log('Downloading from URL:', fileUrl);
            
            // Determine if it's a PDF or HTML file to set the proper MIME type
            const isPdf = pdfPath.toLowerCase().endsWith('.pdf');
            const mimeType = isPdf ? 'application/pdf' : 'text/html';
            
            // Extract or construct a good filename
            let fileName;
            if (pdfPath.includes('/')) {
                fileName = pdfPath.split('/').pop();
            } else {
                // If we can't extract a good filename, create one based on the invoice ID
                const extension = isPdf ? '.pdf' : '.html';
                fileName = `invoice-${invoiceId}${extension}`;
            }
            
            console.log('Download details:', { fileName, mimeType });
            
            // Try using fetch API first, which works better in modern browsers
            // especially for downloading PDFs directly
            fetch(fileUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                    return response.blob();
                })
                .then(blob => {
                    // Create a blob URL and use it with an anchor element
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName;
                    link.style.display = 'none';
                    
                    // Append to DOM, click and cleanup
                    document.body.appendChild(link);
                    link.click();
                    
                    // Cleanup after short delay
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                    }, 100);
                    
                    console.log('Fetch-based download completed successfully');
                })
                .catch(error => {
                    console.warn('Fetch download failed, trying fallback method:', error);
                    // Fallback to traditional download method
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = fileName;
                    link.target = '_blank';
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(link);
                    }, 100);
                });
                
            return true;
        } catch (error) {
            console.error('Error preparing invoice download:', error);
            // Try the fallback method in case of any error
            try {
                // Clean base URL and create the download URL
                let cleanBaseUrl = baseUrl ? baseUrl.replace('/api', '') : '';
                if (cleanBaseUrl.endsWith('/')) cleanBaseUrl = cleanBaseUrl.slice(0, -1);
                const normalizedPath = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`;
                const fileUrl = `${cleanBaseUrl}${normalizedPath}`;
                
                // Open in new tab as last resort
                window.open(fileUrl, '_blank');
                return true;
            } catch (fallbackError) {
                console.error('All download methods failed:', fallbackError);
                return false;
            }
        }
    };
    
    // Test parameters
    const testInvoiceId = 'TEST-001';
    const testBaseUrl = 'https://gst-invoice-system-back.onrender.com/api';
    const testPdfPath = mockApiResponse.pdfPath;
    
    console.log('Test parameters:', {
        invoiceId: testInvoiceId,
        baseUrl: testBaseUrl,
        pdfPath: testPdfPath
    });
    
    // Run the test
    const result = downloadInvoicePdf(testPdfPath, testInvoiceId, testBaseUrl);
    console.log('Download test result:', result);
    
    // Display results in the page
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <h3>Test Results</h3>
        <p><strong>Test Parameters:</strong></p>
        <ul>
            <li>Invoice ID: ${testInvoiceId}</li>
            <li>Base URL: ${testBaseUrl}</li>
            <li>PDF Path: ${testPdfPath}</li>
        </ul>
        <p><strong>Expected Download URL:</strong><br>
        <a href="${testBaseUrl.replace('/api', '')}${testPdfPath}" target="_blank">
            ${testBaseUrl.replace('/api', '')}${testPdfPath}
        </a></p>
        <p><strong>Download initiated:</strong> ${result ? 'YES' : 'NO'}</p>
        <p><strong>Check your browser's download folder for the file.</strong></p>
    `;
}

// Run test when page loads
window.onload = () => {
    console.log('Page loaded, setting up test...');
    document.getElementById('testButton').onclick = testPdfDownload;
};
