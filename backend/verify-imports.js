// Simple verification test
console.log('Testing Node.js basic functionality...');

try {
    // Test 1: Basic require statements
    console.log('1. Testing require statements...');
    const express = require('express');
    const cors = require('cors');
    const bodyParser = require('body-parser');
    const mongoose = require('mongoose');
    console.log('✅ Basic packages loaded successfully');

    // Test 2: Test our models
    console.log('2. Testing model imports...');
    const Customer = require('./models/Customer');
    const Invoice = require('./models/Invoice');
    const Item = require('./models/Item');
    console.log('✅ Models imported successfully');

    // Test 3: Test our routes
    console.log('3. Testing route imports...');
    const authRoutes = require('./routes/authRoutes');
    const customerRoutes = require('./routes/customerRoutes');
    const itemRoutes = require('./routes/itemRoutes');
    const billingRoutes = require('./routes/billingRoutes');
    const gstRoutes = require('./routes/gstRoutes');
    console.log('✅ Routes imported successfully');

    // Test 4: Test utilities
    console.log('4. Testing utility imports...');
    const { calculateTotals } = require('./utils/taxHelpers');
    const { generateUpiQr } = require('./utils/upiHelper');
    console.log('✅ Utilities imported successfully');

    // Test 5: Test main app
    console.log('5. Testing main app import...');
    const app = require('./app');
    console.log('✅ Main app imported successfully');

    console.log('\n🎉 All imports successful! Backend should be able to start.');

} catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
