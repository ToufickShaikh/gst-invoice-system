// Test backend connectivity using built-in modules
const https = require('https');
const http = require('http');

const testBackend = async () => {
    console.log('🔍 Testing backend connectivity...');

    const makeRequest = (url) => {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;

            const req = client.get(url, {
                headers: {
                    'Origin': 'https://shaikhgst.netlify.app',
                    'User-Agent': 'Backend-Test/1.0'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    };

    try {
        console.log('\n1. Testing main endpoint...');
        const mainResponse = await makeRequest('https://gst-invoice-system-back.onrender.com/');
        console.log('✅ Main endpoint status:', mainResponse.status);
        console.log('Response:', mainResponse.data.substring(0, 200));

        console.log('\n2. Testing health endpoint...');
        const healthResponse = await makeRequest('https://gst-invoice-system-back.onrender.com/api/health');
        console.log('✅ Health endpoint status:', healthResponse.status);
        console.log('Response:', healthResponse.data.substring(0, 200));

        console.log('\n🎉 Backend is accessible and responding!');

    } catch (error) {
        console.error('\n❌ Backend test failed:', error.message);
        console.error('This means the Render deployment may be down or not working.');
        console.error('\n🔧 Recommended actions:');
        console.error('1. Check Render dashboard for deployment status');
        console.error('2. Check Render logs for errors');
        console.error('3. Try manual redeploy on Render');
    }
};

testBackend();
