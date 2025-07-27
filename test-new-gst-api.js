// Test the new RapidAPI GST verification service
const { verifyGSTINFromAPI } = require('./backend/utils/gstVerification');

// Test function
async function testNewGSTAPI() {
    console.log('🧪 Testing New RapidAPI GST Verification Service\n');
    
    // Test GSTINs
    const testGSTINs = [
        '22AAAAA0000A1Z5', // Test GSTIN format
        '27AAPFU0939F1ZV', // Maharashtra GSTIN
        '33AABCU9603R1ZM', // Tamil Nadu GSTIN
        '09AABCU9603R1ZV', // UP GSTIN (invalid for testing)
    ];

    for (const gstin of testGSTINs) {
        console.log(`\n📋 Testing GSTIN: ${gstin}`);
        console.log('─'.repeat(50));
        
        try {
            const startTime = Date.now();
            const result = await verifyGSTINFromAPI(gstin);
            const endTime = Date.now();
            
            console.log(`⏱️  Response time: ${endTime - startTime}ms`);
            
            if (result.success) {
                console.log('✅ Verification successful!');
                console.log(`📊 Source: ${result.source}`);
                console.log(`🏢 Company: ${result.data.legalName}`);
                console.log(`📍 State: ${result.data.stateName} (${result.data.stateCode})`);
                console.log(`📅 Registration: ${result.data.registrationDate}`);
                console.log(`🔄 Status: ${result.data.status}`);
                console.log(`🎯 Tax Type: ${result.data.taxType.taxType}`);
                
                if (result.data.address) {
                    console.log(`🏠 Address: ${result.data.address.substring(0, 100)}...`);
                }
            } else {
                console.log('❌ Verification failed');
                console.log(`📝 Error: ${result.error}`);
            }
            
        } catch (error) {
            console.log('💥 Test error:', error.message);
        }
    }
    
    console.log('\n🎉 GST API Testing Complete!');
}

// Test the updated configuration
async function testAPIConfiguration() {
    console.log('\n🔧 Testing API Configuration\n');
    
    // Check RapidAPI credentials
    console.log('📡 RapidAPI Configuration:');
    console.log('   Host: gst-return-status.p.rapidapi.com');
    console.log('   API Key: 89c550f961msh1b9558d22d67712p12e1a9jsn31a3ea3a7e79');
    console.log('   Endpoint: /free/gstin/{gstin}');
    
    // Test connection
    console.log('\n🌐 Testing API connectivity...');
    
    const testGSTIN = '22AAAAA0000A1Z5';
    try {
        const result = await verifyGSTINFromAPI(testGSTIN);
        
        if (result.success) {
            console.log('✅ API connectivity successful');
            console.log(`📊 Data source: ${result.source}`);
        } else {
            console.log('⚠️  API connectivity issues');
            console.log(`📝 Message: ${result.error}`);
        }
    } catch (error) {
        console.log('❌ API connectivity failed');
        console.log(`💥 Error: ${error.message}`);
    }
}

// Run the tests
if (require.main === module) {
    (async () => {
        try {
            await testAPIConfiguration();
            await testNewGSTAPI();
        } catch (error) {
            console.error('Test suite failed:', error);
        }
    })();
}

module.exports = { testNewGSTAPI, testAPIConfiguration };
