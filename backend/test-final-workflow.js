// Final test of complete GST verification workflow
const { verifyAndAutoFillGST } = require('./utils/gstVerification');

async function testCompleteWorkflow() {
    console.log('🧪 Testing complete GST verification workflow...\n');

    const gstin = '33BVRPS2849Q1ZH'; // User's GSTIN

    console.log(`📋 Testing GSTIN: ${gstin}`);
    console.log('='.repeat(50));

    try {
        const result = await verifyAndAutoFillGST(gstin);

        if (result.success) {
            console.log('✅ Complete workflow successful!');
            console.log('\n📊 Auto-fill Fields:');
            console.log('  🏢 Firm Name:', result.autoFillFields.firmName);
            console.log('  🏪 Trade Name:', result.autoFillFields.tradeName);
            console.log('  📍 Address:', result.autoFillFields.firmAddress);
            console.log('  🏙️ City:', result.autoFillFields.city);
            console.log('  🏛️ District:', result.autoFillFields.district);
            console.log('  🗺️ State:', result.autoFillFields.state);
            console.log('  📮 Pincode:', result.autoFillFields.pincode);
            console.log('  💼 Business Type:', result.autoFillFields.businessType);

            console.log('\n💰 Tax Information:');
            console.log('  📈 Tax Type:', result.taxInfo.type);
            console.log('  📋 Description:', result.taxInfo.description);

            console.log('\n✅ This data will auto-fill the frontend form!');
        } else {
            console.log('❌ Workflow failed:', result.error);
        }
    } catch (error) {
        console.error('🚨 Test error:', error.message);
    }
}

// Run the test
testCompleteWorkflow().catch(console.error);
