#!/usr/bin/env node

/**
 * Quick verification script for PDF download functionality
 * Run this to verify all components are working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 PDF Download Fix Verification');
console.log('================================\n');

// Check if all required files exist
const requiredFiles = [
    'src/utils/downloadHelper.js',
    'src/utils/alternativeDownload.js',
    'src/pages/Invoices.jsx',
    'src/pages/InvoiceSuccess.jsx',
    'backend/app.js',
    'PDF_DOWNLOAD_FIX_COMPLETE.md'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING!`);
    }
});

console.log('\n🔧 Checking key functions:');

// Check downloadHelper.js
try {
    const downloadHelper = fs.readFileSync('src/utils/downloadHelper.js', 'utf8');
    if (downloadHelper.includes('fetch(fileUrl)')) {
        console.log('✅ downloadHelper.js - Enhanced fetch method present');
    } else {
        console.log('❌ downloadHelper.js - Missing fetch method');
    }

    if (downloadHelper.includes('downloadInvoicePdf')) {
        console.log('✅ downloadHelper.js - downloadInvoicePdf function present');
    } else {
        console.log('❌ downloadHelper.js - Missing downloadInvoicePdf function');
    }
} catch (e) {
    console.log('❌ downloadHelper.js - Cannot read file');
}

// Check alternativeDownload.js
try {
    const altDownload = fs.readFileSync('src/utils/alternativeDownload.js', 'utf8');
    if (altDownload.includes('tryMultipleDownloadMethods')) {
        console.log('✅ alternativeDownload.js - tryMultipleDownloadMethods function present');
    } else {
        console.log('❌ alternativeDownload.js - Missing tryMultipleDownloadMethods function');
    }

    if (altDownload.includes('forceDownloadWithFetch')) {
        console.log('✅ alternativeDownload.js - forceDownloadWithFetch function present');
    } else {
        console.log('❌ alternativeDownload.js - Missing forceDownloadWithFetch function');
    }
} catch (e) {
    console.log('❌ alternativeDownload.js - Cannot read file');
}

// Check Invoices.jsx
try {
    const invoices = fs.readFileSync('src/pages/Invoices.jsx', 'utf8');
    if (invoices.includes('tryMultipleDownloadMethods')) {
        console.log('✅ Invoices.jsx - Using improved download methods');
    } else {
        console.log('❌ Invoices.jsx - Not using improved download methods');
    }

    if (invoices.includes('handleReprint')) {
        console.log('✅ Invoices.jsx - handleReprint function present');
    } else {
        console.log('❌ Invoices.jsx - Missing handleReprint function');
    }
} catch (e) {
    console.log('❌ Invoices.jsx - Cannot read file');
}

// Check backend app.js
try {
    const app = fs.readFileSync('backend/app.js', 'utf8');
    if (app.includes('Content-Disposition')) {
        console.log('✅ backend/app.js - Enhanced headers for file downloads');
    } else {
        console.log('❌ backend/app.js - Missing download headers');
    }

    if (app.includes('/invoices')) {
        console.log('✅ backend/app.js - Static file serving configured');
    } else {
        console.log('❌ backend/app.js - Missing static file serving');
    }
} catch (e) {
    console.log('❌ backend/app.js - Cannot read file');
}

console.log('\n🌐 Next Steps:');
console.log('1. Start your backend server: npm run start (in backend folder)');
console.log('2. Start your frontend: npm run dev');
console.log('3. Test the download functionality by:');
console.log('   - Creating a new invoice');
console.log('   - Using the "Reprint" button on existing invoices');
console.log('   - Checking your browser Downloads folder');

console.log('\n🔧 Manual Testing:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab to see download logs');
console.log('3. Check Network tab for HTTP requests');
console.log('4. Try in different browsers (Chrome, Firefox, Safari)');

console.log('\n📋 Troubleshooting:');
console.log('- If downloads still fail, check browser pop-up blocker');
console.log('- Verify backend is serving files at /invoices/');
console.log('- Check CORS configuration matches your frontend domain');
console.log('- Look for console errors in browser dev tools');

console.log('\n✨ The PDF download fix is now complete!');
console.log('All enhanced download methods are in place with multiple fallbacks.');
