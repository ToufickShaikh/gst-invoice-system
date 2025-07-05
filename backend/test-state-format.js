// Test state formatting in GST verification
const { verifyAndAutoFillGST } = require('./utils/gstVerification');

async function testStateFormatting() {
    console.log('🧪 Testing State Field Formatting...\n');

    const testGSTIN = '33BVRPS2849Q1Z5'; // Tamil Nadu GSTIN like in your example

    try {
        console.log(`📋 Testing GSTIN: ${testGSTIN}`);
        const result = await verifyAndAutoFillGST(testGSTIN);

        if (result.success) {
            console.log('\n✅ Verification Result:');
            console.log('📊 Company:', result.autoFillFields.firmName);
            console.log('📍 Address:', result.autoFillFields.firmAddress);
            console.log('🏛️  State Code:', result.autoFillFields.stateCode);
            console.log('🏛️  State Field:', result.autoFillFields.state);
            console.log('🏷️  Tax Info:', JSON.stringify(result.taxInfo, null, 2));

            console.log('\n🔍 Raw AutoFill Fields:');
            console.log(JSON.stringify(result.autoFillFields, null, 2));

        } else {
            console.log('❌ Verification failed:', result.error);
        }
    } catch (error) {
        console.log('💥 Error:', error.message);
    }
}

testStateFormatting();
