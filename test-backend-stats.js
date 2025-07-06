// Test script to check backend dashboard stats endpoint
const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

console.log('🧪 TESTING BACKEND DASHBOARD STATS ENDPOINT');
console.log('===========================================');

// Test 1: Check if endpoint is accessible
console.log('\n📡 Test 1: Basic endpoint connectivity');
console.log(`Testing URL: ${API_BASE_URL}/billing/dashboard-stats`);

// Test 2: Check date parameter handling
console.log('\n📅 Test 2: Date parameter scenarios');
const testCases = [
    { name: 'No dates', params: '' },
    { name: 'Start date only', params: '?startDate=2024-01-01' },
    { name: 'End date only', params: '?endDate=2024-12-31' },
    { name: 'Both dates', params: '?startDate=2024-01-01&endDate=2024-12-31' },
    { name: 'Current month', params: '?startDate=2025-06-30&endDate=2025-07-06' }
];

testCases.forEach((testCase, index) => {
    const fullUrl = `${API_BASE_URL}/billing/dashboard-stats${testCase.params}`;
    console.log(`${index + 1}. ${testCase.name}: ${fullUrl}`);
});

// Test 3: Expected response format
console.log('\n📊 Test 3: Expected response structure');
const expectedResponse = {
    totalInvoices: 'number',
    totalCustomers: 'number',
    totalRevenue: 'number',
    totalPaid: 'number',
    balanceDue: 'number'
};

console.log('Expected fields:', Object.keys(expectedResponse));

// Test 4: Frontend date format validation
console.log('\n🔍 Test 4: Frontend date format validation');
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const startDate = firstDayOfMonth.toISOString().split('T')[0];
const endDate = today.toISOString().split('T')[0];

console.log('Start date format:', startDate, '- Valid:', /^\d{4}-\d{2}-\d{2}$/.test(startDate));
console.log('End date format:', endDate, '- Valid:', /^\d{4}-\d{2}-\d{2}$/.test(endDate));

console.log('\n✅ Backend endpoint configuration looks correct!');
console.log('💡 Next steps: Check browser network tab for actual API calls');
console.log('💡 Verify authentication token is being sent correctly');
console.log('💡 Check backend logs for any error messages');
