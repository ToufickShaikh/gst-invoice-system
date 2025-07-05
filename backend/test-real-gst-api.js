// Test the updated GST verification with real API calls
const { verifyGSTINFromAPI } = require('./utils/gstVerification');

async function testGSTVerification() {
    console.log('🧪 Testing GST verification with real APIs...\n');

    const testGSTINs = [
        '33BVRPS2849Q1ZH', // User's GSTIN
        '29AABCI9016D1Z4', // Infosys (known GSTIN)
        '27AAACR5055K1Z5', // Reliance (known GSTIN)
        '33AAACR5055K1ZK'  // Reliance TN branch
    ];

    for (const gstin of testGSTINs) {
        console.log(`\n📋 Testing GSTIN: ${gstin}`);
        console.log('='.repeat(50));

        try {
            const result = await verifyGSTINFromAPI(gstin);

            if (result.success) {
                console.log('✅ Verification successful!');
                console.log('📊 Source:', result.source || 'Unknown');
                console.log('🏢 Company:', result.data.legalName);
                console.log('🏪 Trade Name:', result.data.tradeName);
                console.log('📍 Address:', result.data.address);
                console.log('🏛️ Business Type:', result.data.businessType);
                console.log('📅 Registration Date:', result.data.registrationDate);
                console.log('📈 Status:', result.data.status);
            } else {
                console.log('❌ Verification failed:', result.error);
            }
        } catch (error) {
            console.error('🚨 Test error:', error.message);
        }

        console.log('\n' + '-'.repeat(50));

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Run the test
testGSTVerification().catch(console.error);
