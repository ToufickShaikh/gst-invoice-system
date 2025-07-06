// Test the exact API call the frontend dashboard will make
import axios from 'axios';

const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

async function testFrontendDashboard() {
    console.log('🎯 Testing Frontend Dashboard API Call...\n');

    try {
        // This simulates the exact call the frontend will make with empty date range
        console.log('1. Testing with empty date range (initial load):');
        const emptyDateRange = {};
        const response1 = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            params: emptyDateRange
        });

        console.log('✅ Response:');
        console.log('Status:', response1.status);
        console.log('Data:', JSON.stringify(response1.data, null, 2));
        console.log('');

        // Test with undefined dates (what frontend might send)
        console.log('2. Testing with undefined start/end dates:');
        const undefinedDateRange = { startDate: '', endDate: '' };
        const response2 = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            params: undefinedDateRange
        });

        console.log('✅ Response:');
        console.log('Status:', response2.status);
        console.log('Data:', JSON.stringify(response2.data, null, 2));
        console.log('');

        // Test what happens when user applies current month filter
        console.log('3. Testing with current month filter (this should show the warning):');
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthRange = {
            startDate: firstDayOfMonth.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
        const response3 = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            params: currentMonthRange
        });

        console.log('✅ Response:');
        console.log('Status:', response3.status);
        console.log('Date range used:', currentMonthRange);
        console.log('Data:', JSON.stringify(response3.data, null, 2));
        console.log('');

        // Summary
        console.log('📊 SUMMARY:');
        console.log('- No date filter:', response1.data.totalInvoices, 'invoices, ₹', response1.data.totalRevenue, 'revenue');
        console.log('- Empty date filter:', response2.data.totalInvoices, 'invoices, ₹', response2.data.totalRevenue, 'revenue');
        console.log('- Current month filter:', response3.data.totalInvoices, 'invoices, ₹', response3.data.totalRevenue, 'revenue');

        if (response1.data.totalInvoices > 0) {
            console.log('✅ SUCCESS: Dashboard will now show real data!');
        } else {
            console.log('❌ ISSUE: Still no invoice data showing');
        }

    } catch (error) {
        console.error('❌ Frontend dashboard test failed:');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testFrontendDashboard();
