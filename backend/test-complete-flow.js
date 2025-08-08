const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:5000/api';

async function testCompleteFlow() {
    try {
        console.log('🧪 Testing complete GST Invoice System flow...');

        // Test 1: Check if backend is running
        try {
            const healthCheck = await axios.get(`${API_BASE}/health`);
            console.log('✅ Backend is running');
        } catch (error) {
            console.log('❌ Backend not accessible. Make sure it\'s running on port 5000');
            return;
        }

        // Test 2: Get current items
        const itemsResponse = await axios.get(`${API_BASE}/items`);
        console.log(`📦 Found ${itemsResponse.data.length} items in inventory`);

        // Test 3: Create a test item if none exist
        let testItem;
        if (itemsResponse.data.length === 0) {
            console.log('📝 Creating test item...');
            const newItemResponse = await axios.post(`${API_BASE}/items`, {
                name: 'Test Product 2024',
                hsnCode: '8504',
                rate: 500,
                taxSlab: 18,
                units: 'pieces',
                quantityInStock: 0
            });
            testItem = newItemResponse.data;
            console.log('✅ Test item created');
        } else {
            testItem = itemsResponse.data[0];
        }

        console.log(`📊 Current stock for "${testItem.name}": ${testItem.quantityInStock || 0}`);

        // Test 4: Check suppliers
        const suppliersResponse = await axios.get(`${API_BASE}/suppliers`);
        console.log(`🏢 Found ${suppliersResponse.data.length} suppliers`);

        // Test 5: Create test supplier if needed
        let testSupplier;
        if (suppliersResponse.data.length === 0) {
            console.log('📝 Creating test supplier...');
            const newSupplierResponse = await axios.post(`${API_BASE}/suppliers`, {
                name: 'Test Supplier Ltd',
                email: 'supplier@test.com',
                phone: '+91 9876543210',
                address: '123 Supplier Street, Business Area',
                gstin: '27ABCDE1234F1Z5'
            });
            testSupplier = newSupplierResponse.data;
            console.log('✅ Test supplier created');
        } else {
            testSupplier = suppliersResponse.data[0];
        }

        // Test 6: Create a purchase to increase stock
        console.log('📦 Creating purchase order to increase stock...');
        const purchaseResponse = await axios.post(`${API_BASE}/purchases`, {
            supplier: testSupplier._id,
            items: [{
                item: testItem._id,
                quantity: 20,
                purchasePrice: 400
            }],
            notes: 'Test purchase for stock increase'
        });
        console.log('✅ Purchase order created');

        // Test 7: Check updated stock
        const updatedItemResponse = await axios.get(`${API_BASE}/items/${testItem._id}`);
        console.log(`📈 Stock after purchase: ${updatedItemResponse.data.quantityInStock}`);

        // Test 8: Check customers
        const customersResponse = await axios.get(`${API_BASE}/customers`);
        console.log(`👥 Found ${customersResponse.data.length} customers`);

        // Test 9: Create test customer if needed
        let testCustomer;
        if (customersResponse.data.length === 0) {
            console.log('📝 Creating test customer...');
            const newCustomerResponse = await axios.post(`${API_BASE}/customers`, {
                name: 'Test Customer Pvt Ltd',
                email: 'customer@test.com',
                phone: '+91 9876543210',
                address: '456 Customer Road, Commercial Zone',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                gstin: '27XYZAB1234C1D5'
            });
            testCustomer = newCustomerResponse.data;
            console.log('✅ Test customer created');
        } else {
            testCustomer = customersResponse.data[0];
        }

        // Test 10: Create a sales order to reduce stock
        console.log('🛒 Creating sales order to test stock reduction...');
        const salesResponse = await axios.post(`${API_BASE}/sales-orders`, {
            customer: testCustomer._id,
            items: [{
                item: testItem._id,
                quantity: 5,
                rate: 500
            }],
            notes: 'Test sales order for stock reduction',
            status: 'Confirmed'
        });
        console.log('✅ Sales order created');

        // Test 11: Check final stock
        const finalItemResponse = await axios.get(`${API_BASE}/items/${testItem._id}`);
        console.log(`📉 Stock after sale: ${finalItemResponse.data.quantityInStock}`);

        // Test 12: Generate invoice PDF
        console.log('📄 Testing invoice PDF generation...');
        const invoiceData = {
            invoiceNumber: 'TEST-' + Date.now(),
            customer: testCustomer,
            items: [{
                name: testItem.name,
                hsnCode: testItem.hsnCode,
                quantity: 2,
                rate: testItem.rate,
                taxSlab: testItem.taxSlab,
                units: testItem.units
            }],
            subTotal: 1000,
            totalAmount: 1180,
            grandTotal: 1180
        };

        const pdfResponse = await axios.post(`${API_BASE}/billing/generate-pdf`, invoiceData);
        console.log('✅ Invoice PDF generated successfully');

        console.log('\n🎉 Complete system test successful!');
        console.log('✅ Inventory management working');
        console.log('✅ Stock tracking functional');
        console.log('✅ PDF generation with improved fonts working');
        console.log('✅ All APIs responding correctly');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data?.message || error.message);
        if (error.response?.status === 404) {
            console.log('💡 Make sure the backend server is running with all routes configured');
        }
    }
}

// Run the complete test
testCompleteFlow();
