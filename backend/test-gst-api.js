// Quick test for GST API endpoints
const { validateGSTIN, verifyAndAutoFillGST } = require('./utils/gstVerification');

async function testGSTAPI() {
    const testGSTIN = '29AAAAA0000A1Z5';

    console.log('Testing GSTIN validation and verification...\n');

    // Test validation
    console.log('1. Testing GSTIN validation:');
    const validation = validateGSTIN(testGSTIN);
    console.log('Validation result:', validation);

    // Test verification
    console.log('\n2. Testing GSTIN verification:');
    try {
        const verification = await verifyAndAutoFillGST(testGSTIN);
        console.log('Verification result:', JSON.stringify(verification, null, 2));
    } catch (error) {
        console.log('Verification error:', error.message);
    }
}

testGSTAPI();
