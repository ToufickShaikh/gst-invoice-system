// Test the new intelligent GSTIN lookup
const { verifyAndAutoFillGST } = require('./utils/gstVerification');

async function testIntelligentGST() {
    console.log('🧪 Testing Intelligent GST Lookup...\n');

    const testCases = [
        {
            gstin: '33BVRPS2849Q1ZH', // User's GSTIN
            description: 'User GSTIN (pattern-based)'
        },
        {
            gstin: '33AABCT1332L1ZU', // Real TCS GSTIN
            description: 'Real company (TCS) - should show actual data'
        },
        {
            gstin: '27AAACR5055K1Z5', // Real Reliance GSTIN
            description: 'Real company (Reliance) - should show actual data'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.description}`);
        console.log(`🔍 GSTIN: ${testCase.gstin}`);
        console.log('⏳ Processing...');

        try {
            const result = await verifyAndAutoFillGST(testCase.gstin);

            if (result.success) {
                console.log('✅ SUCCESS!');
                console.log(`🏢 Company: ${result.autoFillFields.firmName}`);
                console.log(`📍 Address: ${result.autoFillFields.firmAddress}`);
                console.log(`🏛️  City: ${result.autoFillFields.city}`);
                console.log(`🏛️  State: ${result.autoFillFields.state}`);
                console.log(`🏷️  Type: ${result.autoFillFields.businessType}`);
                console.log(`💼 Tax Type: ${JSON.stringify(result.taxInfo)}`);

                // Check if it's real data or pattern-based
                if (result.autoFillFields.firmName.includes('TCS') ||
                    result.autoFillFields.firmName.includes('RELIANCE') ||
                    result.autoFillFields.firmName.includes('INFOSYS')) {
                    console.log('🎯 REAL COMPANY DATA FOUND!');
                } else {
                    console.log('🔧 Pattern-based intelligent data generated');
                }
            } else {
                console.log('❌ FAILED:', result.error);
            }
        } catch (error) {
            console.log('💥 ERROR:', error.message);
        }

        console.log('─'.repeat(70));
    }

    console.log('\n🎉 Test completed!');
}

testIntelligentGST();
