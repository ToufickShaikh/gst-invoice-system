// Debug script to test dashboard stats API endpoint
import axios from 'axios';

const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

async function testDashboardStats() {
    console.log('🔍 Testing Dashboard Stats API...\n');

    try {
        // Test 1: Basic request without authentication
        console.log('Test 1: Basic request without date range');
        const response1 = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`);
        console.log('✅ Response received:');
        console.log('Status:', response1.status);
        console.log('Data:', JSON.stringify(response1.data, null, 2));
        console.log('');

        // Test 2: Request with date range
        console.log('Test 2: Request with date range');
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const response2 = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`, {
            params: { startDate, endDate }
        });
        console.log('✅ Response with date range received:');
        console.log('Status:', response2.status);
        console.log('Date range:', { startDate, endDate });
        console.log('Data:', JSON.stringify(response2.data, null, 2));
        console.log('');

        // Test 3: Check for any invoices
        console.log('Test 3: Check if there are any invoices');
        const invoicesResponse = await axios.get(`${API_BASE_URL}/billing/invoices`);
        console.log('✅ Invoices response:');
        console.log('Status:', invoicesResponse.status);
        console.log('Number of invoices:', invoicesResponse.data.length);
        if (invoicesResponse.data.length > 0) {
            console.log('Sample invoice:', JSON.stringify(invoicesResponse.data[0], null, 2));
        }
        console.log('');

        // Test 4: Check for any customers
        console.log('Test 4: Check if there are any customers');
        const customersResponse = await axios.get(`${API_BASE_URL}/customers`);
        console.log('✅ Customers response:');
        console.log('Status:', customersResponse.status);
        console.log('Number of customers:', customersResponse.data.length);
        console.log('');

    } catch (error) {
        console.error('❌ Error occurred:');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        console.error('Full error:', error);
    }
}

// Run the test
testDashboardStats();
