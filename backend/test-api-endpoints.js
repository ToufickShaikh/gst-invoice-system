// Test specific API endpoints that are failing
const https = require('https');

const testApiEndpoints = async () => {
    console.log('🔍 Testing specific API endpoints...');

    const makeRequest = (url) => {
        return new Promise((resolve, reject) => {
            const req = https.get(url, {
                headers: {
                    'Origin': 'https://shaikhgst.netlify.app',
                    'User-Agent': 'API-Test/1.0'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data.substring(0, 200)
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    };

    const endpoints = [
        'https://gst-invoice-system-back.onrender.com/api/billing/invoices?billingType=B2B',
        'https://gst-invoice-system-back.onrender.com/api/items',
        'https://gst-invoice-system-back.onrender.com/api/customers'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`\n🔍 Testing: ${endpoint}`);
            const response = await makeRequest(endpoint);
            console.log(`✅ Status: ${response.status}`);
            console.log(`✅ CORS Headers: Access-Control-Allow-Origin = ${response.headers['access-control-allow-origin'] || 'NOT SET'}`);
            console.log(`✅ Response: ${response.data}`);
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
        }
    }
};

testApiEndpoints();
