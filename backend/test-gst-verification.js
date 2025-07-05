// Test GST Verification functionality
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('./utils/gstVerification');

async function testGSTVerification() {
    console.log('🧪 Testing GST Verification functionality...\n');

    // Test 1: Valid GSTIN format validation
    console.log('1. Testing GSTIN format validation:');
    const validGSTIN = '33BVRPS2849Q1ZH'; // Example Tamil Nadu GSTIN
    const validation = validateGSTIN(validGSTIN);
    console.log('✅ Valid GSTIN:', validation);

    // Test 2: Invalid GSTIN
    const invalidGSTIN = '123456789';
    const invalidValidation = validateGSTIN(invalidGSTIN);
    console.log('❌ Invalid GSTIN:', invalidValidation);

    // Test 3: Tax type determination
    console.log('\n2. Testing tax type determination:');

    // Same state (Tamil Nadu = 33) - Should be CGST+SGST
    const sameStateTax = determineTaxType('33');
    console.log('Same state (33-TN):', sameStateTax);

    // Different state (Maharashtra = 27) - Should be IGST
    const diffStateTax = determineTaxType('27');
    console.log('Different state (27-MH):', diffStateTax);

    // Test 4: Complete GST verification
    console.log('\n3. Testing complete GST verification:');
    try {
        const fullVerification = await verifyAndAutoFillGST('27ABCDE1234F1Z5');
        console.log('✅ Full verification result:');
        console.log('Company:', fullVerification.autoFillFields?.firmName);
        console.log('Address:', fullVerification.autoFillFields?.firmAddress);
        console.log('State:', fullVerification.autoFillFields?.state);
        console.log('Tax Type:', fullVerification.taxInfo?.taxType);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }

    console.log('\n🎉 GST verification tests completed!');
}

// Run the test
testGSTVerification();
