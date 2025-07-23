// Test script to verify logo, signature, and UPI QR code changes
console.log('Testing updated invoice generation...');

// Test UPI QR generation with different amounts
const { generateUpiQr } = require('./backend/utils/upiHelper');

async function testUpiQr() {
    console.log('\n=== Testing UPI QR Code Generation ===');

    try {
        // Test with amount
        console.log('1. Testing with amount (₹100):');
        const withAmount = await generateUpiQr('shaikhtool@ibl', '100');
        console.log('   UPI Link:', withAmount.upiLink);
        console.log('   QR Generated:', withAmount.qrCodeImage ? 'Yes' : 'No');

        // Test with zero amount
        console.log('\n2. Testing with zero amount:');
        const withZero = await generateUpiQr('shaikhtool@ibl', '0');
        console.log('   UPI Link:', withZero.upiLink);
        console.log('   QR Generated:', withZero.qrCodeImage ? 'Yes' : 'No');

        // Test with null amount
        console.log('\n3. Testing with null amount:');
        const withNull = await generateUpiQr('shaikhtool@ibl', null);
        console.log('   UPI Link:', withNull.upiLink);
        console.log('   QR Generated:', withNull.qrCodeImage ? 'Yes' : 'No');

        console.log('\n✅ UPI QR tests completed successfully!');

    } catch (error) {
        console.error('❌ UPI QR test failed:', error);
    }
}

async function testImageUrls() {
    console.log('\n=== Testing Image URLs ===');

    const logoUrl = 'https://bri.ct.ws/include/logo.png';
    const signUrl = 'https://bri.ct.ws/include/sign.png';

    // Test logo URL
    try {
        const logoResponse = await fetch(logoUrl, { method: 'HEAD' });
        console.log(`Logo URL (${logoUrl}):`, logoResponse.ok ? '✅ Accessible' : '❌ Not accessible');
    } catch (error) {
        console.log(`Logo URL (${logoUrl}): ❌ Error -`, error.message);
    }

    // Test signature URL
    try {
        const signResponse = await fetch(signUrl, { method: 'HEAD' });
        console.log(`Signature URL (${signUrl}):`, signResponse.ok ? '✅ Accessible' : '❌ Not accessible');
    } catch (error) {
        console.log(`Signature URL (${signUrl}): ❌ Error -`, error.message);
    }
}

// Run tests
testUpiQr().then(() => {
    if (typeof fetch !== 'undefined') {
        return testImageUrls();
    } else {
        console.log('\n⚠️ Skipping URL tests (fetch not available in this environment)');
        console.log('You can manually verify the URLs:');
        console.log('- Logo: https://bri.ct.ws/include/logo.png');
        console.log('- Signature: https://bri.ct.ws/include/sign.png');
    }
}).then(() => {
    console.log('\n🎉 All tests completed!');
    console.log('\nChanges made:');
    console.log('✅ Updated logo URL to: https://bri.ct.ws/include/logo.png');
    console.log('✅ Updated signature URL to: https://bri.ct.ws/include/sign.png');
    console.log('✅ Modified UPI QR to work with zero amounts');
    console.log('\nNext steps:');
    console.log('1. Restart your backend server');
    console.log('2. Try generating an invoice');
    console.log('3. Check that the new logo and signature appear');
    console.log('4. Test with both paid and unpaid invoices to verify UPI QR');
});
