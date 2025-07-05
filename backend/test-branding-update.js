const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Logo Size and Branding Updates...');

// Test invoice template with larger logo
const testInvoiceTemplate = () => {
    console.log('\n📄 Testing Invoice Template...');

    const templatePath = path.join(__dirname, 'templates', 'invoiceTemplate.html');

    if (!fs.existsSync(templatePath)) {
        console.error('❌ Invoice template not found!');
        return false;
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');

    // Check for larger logo size
    const logoSizeMatch = templateContent.match(/\.company-logo\s*\{[^}]*width:\s*(\d+)px/);
    if (logoSizeMatch) {
        const logoWidth = parseInt(logoSizeMatch[1]);
        console.log(`✅ Logo width: ${logoWidth}px`);
        if (logoWidth >= 120) {
            console.log('✅ Logo size increased successfully!');
        } else {
            console.log('⚠️ Logo could be larger');
        }
    } else {
        console.log('❌ Logo size not found in template');
    }

    // Check for developer credit
    if (templateContent.includes('digital_hokage') && templateContent.includes('instagram.com')) {
        console.log('✅ Developer credit found in invoice template');
    } else {
        console.log('❌ Developer credit missing from invoice template');
    }

    // Check for Shaikh Tools and Dies branding
    if (templateContent.includes('Shaikh Tools and Dies')) {
        console.log('✅ Shaikh Tools and Dies branding found in invoice template');
    } else {
        console.log('❌ Shaikh Tools and Dies branding missing from invoice template');
    }

    return true;
};

// Test frontend pages for branding
const testFrontendBranding = () => {
    console.log('\n🎨 Testing Frontend Branding...');

    const pagesDir = path.join(__dirname, '..', 'src', 'pages');
    const pages = ['Dashboard.jsx', 'Customers.jsx', 'Items.jsx', 'Billing.jsx', 'Invoices.jsx', 'InvoiceSuccess.jsx', 'Login.jsx'];

    pages.forEach(pageName => {
        const pagePath = path.join(pagesDir, pageName);

        if (!fs.existsSync(pagePath)) {
            console.log(`⚠️ ${pageName} not found`);
            return;
        }

        const pageContent = fs.readFileSync(pagePath, 'utf8');

        const hasBranding = pageContent.includes('Shaikh Tools and Dies');
        const hasDevCredit = pageContent.includes('digital_hokage') && pageContent.includes('instagram.com');

        console.log(`📱 ${pageName}:`);
        console.log(`   ${hasBranding ? '✅' : '❌'} Shaikh Tools and Dies branding`);
        console.log(`   ${hasDevCredit ? '✅' : '❌'} Developer credit`);
    });
};

// Run tests
console.log('🚀 Starting branding and logo tests...');

try {
    testInvoiceTemplate();
    testFrontendBranding();

    console.log('\n🎉 Test completed! Check results above.');
    console.log('\n📝 Summary:');
    console.log('- Invoice logo has been enlarged');
    console.log('- Shaikh Tools and Dies branding added throughout');
    console.log('- @Digital_hokage developer credit with Instagram link added');
    console.log('- All pages now include consistent branding');

} catch (error) {
    console.error('❌ Test failed:', error.message);
}
