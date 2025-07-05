// Test real GST verification
const { verifyAndAutoFillGST } = require('./utils/gstVerification');

async function testRealGSTVerification() {
    console.log('🧪 Testing Real GST Verification...\n');

    const testGSTINs = [
        '27AAAAA0000A1Z5', // Maharashtra
        '29AAAAA0000A1Z5', // Karnataka
        '33AAAAA0000A1Z5', // Tamil Nadu
        '06AAAAA0000A1Z5'  // Haryana
    ];

    for (const gstin of testGSTINs) {
        console.log(`\n📋 Testing GSTIN: ${gstin}`);
        console.log('⏳ Verifying...');

        try {
            const result = await verifyAndAutoFillGST(gstin);

            if (result.success) {
                console.log('✅ Verification successful!');
                console.log(`📊 Company: ${result.autoFillFields.firmName}`);
                console.log(`📍 Address: ${result.autoFillFields.firmAddress}`);
                console.log(`🏛️  State: ${result.autoFillFields.state}`);
                console.log(`💼 Business Type: ${result.autoFillFields.businessType}`);
                console.log(`🏷️  Tax Type: ${result.taxInfo.type}`);
            } else {
                console.log('❌ Verification failed:', result.error);
            }
        } catch (error) {
            console.log('💥 Error during verification:', error.message);
        }

        console.log('─'.repeat(50));
    }

    console.log('\n🎉 Test completed!');
}

testRealGSTVerification();
