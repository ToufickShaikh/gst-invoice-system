// Test dashboard stats without authentication
import axios from 'axios';

const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

async function testDashboardWithoutAuth() {
    console.log('🔍 Testing Dashboard Stats WITHOUT Authentication...\n');

    try {
        const response = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`);
        console.log('✅ Dashboard stats without auth:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        // Test with date range
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const filteredResponse = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            params: { startDate, endDate }
        });

        console.log('✅ Dashboard stats with date filter (no auth):');
        console.log('Date range:', { startDate, endDate });
        console.log('Data:', JSON.stringify(filteredResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Dashboard stats test failed:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testDashboardWithoutAuth();
