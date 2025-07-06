/**
 * Utility function to download files from URLs
 * This is useful for downloading PDFs, CSVs, and other files
 */

/**
 * Downloads a file from a URL and automatically initiates the download
 * 
 * @param {string} url - The URL to download
 * @param {string} [fileName] - Optional filename for the download (if not provided, will extract from URL)
 * @param {string} [mimeType] - Optional MIME type for the download
 * @returns {boolean} Success state of download initiation
 */
export const downloadFile = (url, fileName, mimeType) => {
    try {
        if (!url) {
            console.error('Download URL is missing');
            return false;
        }

        console.log('Starting download process for URL:', url);
        
        // Method 1: Using anchor element with download attribute
        try {
            // Create a hidden download link
            const downloadLink = document.createElement('a');
            downloadLink.href = url;

            // Set the download attribute with appropriate filename
            if (fileName) {
                downloadLink.download = fileName;
                downloadLink.setAttribute('download', fileName); // Double-set for compatibility
            } else {
                // Extract filename from the URL if not provided
                const urlParts = url.split('/');
                const defaultFileName = urlParts[urlParts.length - 1];
                downloadLink.download = defaultFileName;
                downloadLink.setAttribute('download', defaultFileName);
            }

            // Set additional attributes for forcing download
            downloadLink.target = '_blank';
            downloadLink.rel = 'noopener noreferrer';
            
            // Set MIME type if provided
            if (mimeType) {
                downloadLink.type = mimeType;
            }

            // Style to be invisible
            downloadLink.style.display = 'none';
            
            // Append to DOM, trigger click, and remove
            document.body.appendChild(downloadLink);
            console.log('Download link created with attributes:', {
                href: downloadLink.href,
                download: downloadLink.download,
                type: downloadLink.type
            });
            
            // Click with a small delay to ensure the browser processes it
            setTimeout(() => {
                downloadLink.click();
                console.log('Download link clicked');
                
                // Remove after a small delay
                setTimeout(() => {
                    document.body.removeChild(downloadLink);
                    console.log('Download link removed from DOM');
                }, 100);
            }, 50);

            console.log(`Download initiated for ${fileName || 'file'}`);
            return true;
        } catch (anchorError) {
            console.warn('Anchor download method failed, trying alternative:', anchorError);
            
            // Method 2: Alternative approach using window.open with _blank target
            // This is a fallback that might work in some browsers when the download attribute doesn't
            window.open(url, '_blank');
            console.log('Opened URL in new tab as fallback');
            return true;
        }
    } catch (error) {
        console.error('Error initiating download:', error);
        return false;
    }
};

/**
 * Downloads a PDF invoice from the server using multiple methods to ensure compatibility across browsers
 * 
 * @param {string} pdfPath - The path to the PDF on the server
 * @param {string} invoiceId - The invoice ID (used as fallback for filename)
 * @param {string} baseUrl - The base URL of the API server
 * @returns {boolean} Success state of download initiation
 */
export const downloadInvoicePdf = (pdfPath, invoiceId, baseUrl) => {
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
                return downloadFile(fileUrl, fileName, mimeType);
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
