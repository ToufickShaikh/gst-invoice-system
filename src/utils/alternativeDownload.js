/**
 * This file contains alternative download methods
 * for browsers that may block or handle download links differently.
 */

/**
 * Force download using fetch and blob
 * This method works better in some browsers by using a direct blob download
 * 
 * @param {string} url - URL to download
 * @param {string} filename - Name to save the file as
 * @param {string} [mimeType] - Optional MIME type
 * @returns {Promise<boolean>} - Success status
 */
export const forceDownloadWithFetch = async (url, filename, mimeType) => {
    try {
        console.log(`Attempting fetch download: ${url} as ${filename}`);

        // Add cache-busting parameter to avoid caching issues
        const cacheBusterUrl = url.includes('?')
            ? `${url}&_cacheBuster=${Date.now()}`
            : `${url}?_cacheBuster=${Date.now()}`;

        // Set up request options with proper headers to force download
        const requestOptions = {
            method: 'GET',
            // Remove problematic headers that cause CORS issues
            mode: 'cors',
            credentials: 'include' // Include credentials for cross-origin requests
        };

        // Fetch the file
        const response = await fetch(cacheBusterUrl, requestOptions);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        // Get the blob with proper content-type
        const blob = await response.blob();
        const contentType = mimeType || response.headers.get('content-type') || 'application/octet-stream';

        // Create new blob with proper content type to ensure browser handles it correctly
        const fileBlob = new Blob([blob], { type: contentType });

        // Create object URL
        const objectUrl = URL.createObjectURL(fileBlob);

        // Create download link with enhanced attributes
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        link.setAttribute('download', filename); // Double-set for compatibility
        link.setAttribute('type', contentType);
        link.style.display = 'none';
        link.rel = 'noopener noreferrer';

        // Trigger click with a small delay to ensure proper handling
        document.body.appendChild(link);

        // Using setTimeout helps with browser throttling
        setTimeout(() => {
            link.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));

            // Cleanup after a bit longer delay to ensure processing
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(objectUrl);
                console.log('Fetch download complete, resources cleaned up');
            }, 200);
        }, 50);

        return true;
    } catch (error) {
        console.error('Fetch download failed:', error);
        return false;
    }
};

/**
 * Open a download in an iframe
 * This can help when browsers block downloads in certain scenarios
 * 
 * @param {string} url - URL to download
 * @returns {boolean} - Success status
 */
export const iframeDownload = (url) => {
    try {
        console.log(`Attempting iframe download: ${url}`);

        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.display = 'none';

        // Append to document
        document.body.appendChild(iframe);

        // Remove iframe after a delay
        setTimeout(() => {
            document.body.removeChild(iframe);
            console.log('Iframe download complete, iframe removed');
        }, 1000);

        return true;
    } catch (error) {
        console.error('Iframe download failed:', error);
        return false;
    }
};

/**
 * Try multiple download methods in sequence with enhanced browser compatibility
 * 
 * @param {string} url - URL to download
 * @param {string} filename - Name to save the file as
 * @param {string} [mimeType] - Optional MIME type (recommended for PDFs)
 * @returns {Promise<boolean>} - Success status
 */
export const tryMultipleDownloadMethods = async (url, filename, mimeType) => {
    // Add browser detection for method selection
    const isChrome = navigator.userAgent.indexOf("Chrome") !== -1;
    const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
    const isSafari = navigator.userAgent.indexOf("Safari") !== -1 && !isChrome;
    const isIE = /*@cc_on!@*/false || !!document.documentMode;
    const isEdge = !isIE && !!window.StyleMedia;

    console.log(`Browser detection: Chrome=${isChrome}, Firefox=${isFirefox}, Safari=${isSafari}, IE=${isIE}, Edge=${isEdge}`);
    console.log(`Starting download for: ${url} as ${filename}`);

    // For PDFs in Safari, direct window.open works better
    if (isSafari && mimeType === 'application/pdf') {
        try {
            window.open(url, '_blank');
            console.log('Safari PDF download: Used direct window.open');
            return true;
        } catch (e) {
            console.warn('Safari window.open failed, continuing with other methods');
        }
    }

    // Method 1: Fetch API method - works best in modern browsers
    try {
        console.log('Trying fetch download method first');
        const success = await forceDownloadWithFetch(url, filename, mimeType);
        if (success) return true;
    } catch (e) {
        console.warn('Fetch download failed, trying standard link method...', e);
    }

    // Method 2: Standard download link - better for certain file types
    try {
        console.log('Trying standard link download method');
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.setAttribute('download', filename);
        if (mimeType) link.type = mimeType;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';

        document.body.appendChild(link);

        // Use a MouseEvent for better compatibility
        const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        link.dispatchEvent(event);

        // Remove after a delay
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);

        console.log('Standard download link method attempted');
        return true;
    } catch (e) {
        console.warn('Standard link download failed, trying iframe method...', e);
    }

    // Method 3: Iframe method - works in some legacy browsers
    try {
        console.log('Trying iframe download method');
        return iframeDownload(url);
    } catch (e) {
        console.warn('Iframe download failed, trying direct window.open...', e);
    }

    // Method 4: Last resort - direct browser open
    try {
        console.log('Trying direct window.open as last resort');
        const opened = window.open(url, '_blank');
        if (!opened) {
            console.warn('Popup blocked. Providing final fallback with location.href');
            // This is truly the last resort and may navigate away from the page
            const newTab = window.open('about:blank', '_blank');
            if (newTab) {
                newTab.document.write(`<html><body><h3>Your download is starting...</h3><p>If it doesn't start automatically, <a href="${url}" download="${filename}">click here</a>.</p></body></html>`);
                newTab.location.href = url;
            } else {
                return false;
            }
        }
        return true;
    } catch (e) {
        console.error('All download methods failed', e);
        return false;
    }
};
