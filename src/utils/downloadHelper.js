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

    // Create a hidden download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    
    // Set the download attribute with appropriate filename
    if (fileName) {
      downloadLink.download = fileName;
    } else {
      // Extract filename from the URL if not provided
      const urlParts = url.split('/');
      downloadLink.download = urlParts[urlParts.length - 1];
    }
    
    // Set MIME type if provided
    if (mimeType) {
      downloadLink.type = mimeType;
    }
    
    // Append to DOM, trigger click, and remove
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    console.log(`Download initiated for ${fileName || 'file'}`);
    return true;
    
  } catch (error) {
    console.error('Error initiating download:', error);
    return false;
  }
};

/**
 * Downloads a PDF invoice from the server
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

    // Clean base URL by removing '/api' if present
    const cleanBaseUrl = baseUrl ? baseUrl.replace('/api', '') : '';
    
    // Construct the full URL to the PDF/HTML file
    const pdfUrl = `${cleanBaseUrl}${pdfPath}`; // pdfPath should already start with '/'
    
    // Extract the invoice number from the path for the filename
    const fileName = pdfPath.split('/').pop() || `invoice-${invoiceId}.pdf`;
    
    return downloadFile(pdfUrl, fileName, 'application/pdf');
    
  } catch (error) {
    console.error('Error preparing invoice download:', error);
    return false;
  }
};
