// Simple test to check authentication and API endpoints
import axios from 'axios';

const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

// Test authentication
async function testAuth() {
    console.log('🔐 Testing Authentication...\n');

    try {
        // Simulate login to get a token
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'hokage', // correct admin credentials
            password: 'admin'
        });

        console.log('✅ Login successful');
        console.log('Token received:', !!loginResponse.data.token);

        const token = loginResponse.data.token;

        // Test dashboard stats with authentication
        const statsResponse = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Dashboard stats with auth:');
        console.log('Status:', statsResponse.status);
        console.log('Data:', JSON.stringify(statsResponse.data, null, 2));

        // Test with date range
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const filteredResponse = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: { startDate, endDate }
        });

        console.log('✅ Dashboard stats with date filter:');
        console.log('Date range:', { startDate, endDate });
        console.log('Data:', JSON.stringify(filteredResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Authentication/API test failed:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testAuth();
