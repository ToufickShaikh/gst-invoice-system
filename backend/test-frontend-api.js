// Test the exact same GSTIN from frontend to see the API response
const https = require('https');

function testFrontendAPI() {
    const gstin = '33BVRPS2849Q1ZH';

    console.log('🧪 Testing Frontend API Call...\n');
    console.log(`📋 GSTIN: ${gstin}\n`);

    // Test validation endpoint
    console.log('1️⃣ Testing validation endpoint...');
    const validationUrl = `https://gst-invoice-system-back.onrender.com/api/gst/validate/${gstin}`;

    https.get(validationUrl, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            console.log('✅ Validation Response:');
            console.log(JSON.stringify(JSON.parse(data), null, 2));

            // Test verification endpoint
            console.log('\n2️⃣ Testing verification endpoint...');
            const verificationUrl = `https://gst-invoice-system-back.onrender.com/api/gst/verify/${gstin}`;

            https.get(verificationUrl, (response2) => {
                let data2 = '';

                response2.on('data', (chunk) => {
                    data2 += chunk;
                });

                response2.on('end', () => {
                    console.log('✅ Verification Response:');
                    const verificationResult = JSON.parse(data2);
                    console.log(JSON.stringify(verificationResult, null, 2));

                    console.log('\n🔍 Key Fields Check:');
                    console.log('  - verified:', verificationResult.verified);
                    console.log('  - has companyDetails:', !!verificationResult.companyDetails);
                    console.log('  - legalName:', verificationResult.companyDetails?.legalName);
                    console.log('  - state:', verificationResult.companyDetails?.state);
                    console.log('  - principalPlaceOfBusiness:', verificationResult.companyDetails?.principalPlaceOfBusiness);
                });
            }).on('error', (error) => {
                console.log('❌ Verification request failed:', error.message);
            });
        });
    }).on('error', (error) => {
        console.log('❌ Validation request failed:', error.message);
    });
}

testFrontendAPI();
