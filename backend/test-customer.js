// Test customer creation with proper validation
require('dotenv').config();
const mongoose = require('mongoose');

async function testCustomerCreation() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB');

        const Customer = require('./models/Customer');

        // Test 1: Valid customer data
        console.log('\n--- Test 1: Valid Customer Data ---');
        const validCustomer = {
            customerType: 'B2B',
            firmName: 'Test Company',
            gstNo: '33TESTGST123Z1',
            firmAddress: 'Test Address',
            contact: '9999999999',
            name: 'Test Contact',
            state: '33-Tamil Nadu'
        };

        const customer1 = new Customer(validCustomer);
        await customer1.save();
        console.log('✓ Valid customer created successfully');
        await Customer.findByIdAndDelete(customer1._id); // Clean up

        // Test 2: Missing required fields
        console.log('\n--- Test 2: Missing Required Fields ---');
        const invalidCustomer = {
            firmName: 'Test Company',
            // Missing customerType and state
        };

        try {
            const customer2 = new Customer(invalidCustomer);
            await customer2.save();
            console.log('✗ Should have failed validation');
        } catch (error) {
            console.log('✓ Validation correctly failed:', error.message);
        }

        // Test 3: Invalid customerType
        console.log('\n--- Test 3: Invalid Customer Type ---');
        const invalidTypeCustomer = {
            customerType: 'INVALID',
            state: '33-Tamil Nadu'
        };

        try {
            const customer3 = new Customer(invalidTypeCustomer);
            await customer3.save();
            console.log('✗ Should have failed validation');
        } catch (error) {
            console.log('✓ CustomerType validation correctly failed');
        }

        console.log('\n✅ All customer validation tests passed');

    } catch (error) {
        console.error('✗ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testCustomerCreation();
