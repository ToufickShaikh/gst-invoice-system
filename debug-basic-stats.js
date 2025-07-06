// Test dashboard stats without any date filters
import axios from 'axios';

const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

async function testBasicStats() {
    console.log('🔍 Testing Dashboard Stats WITHOUT Date Filters...\n');

    try {
        const response = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`);
        console.log('✅ Dashboard stats (no date filter):');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Dashboard stats test failed:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testBasicStats();
