// Test script to verify date picker functionality
console.log('Testing Date Picker Logic');

// Test date initialization
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const startDate = firstDayOfMonth.toISOString().split('T')[0];
const endDate = today.toISOString().split('T')[0];

console.log('Start Date:', startDate);
console.log('End Date:', endDate);
console.log('Date format is valid for HTML date input:', /^\d{4}-\d{2}-\d{2}$/.test(startDate));

// Test date range object
const dateRange = {
    startDate,
    endDate
};

console.log('Date Range Object:', dateRange);

// Test onChange simulation
const handleDateChange = (name, value) => {
    console.log('Date change simulation:', name, value);
    const newDateRange = { ...dateRange, [name]: value };
    console.log('Updated date range:', newDateRange);
};

// Simulate date changes
handleDateChange('startDate', '2024-01-01');
handleDateChange('endDate', '2024-12-31');

console.log('Date picker test completed successfully!');
