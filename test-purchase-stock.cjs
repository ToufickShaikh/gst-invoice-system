const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testPurchaseStockFlow() {
    try {
        console.log('🧪 Testing Purchase Stock Flow...');

        // Check if backend is running
        try {
            await axios.get(`${API_BASE}/health`);
            console.log('✅ Backend is running');
        } catch (error) {
            console.log('❌ Backend not accessible. Make sure it\'s running on port 5000');
            return;
        }

        // Get or create test item
        let testItem;
        try {
            const itemsResponse = await axios.get(`${API_BASE}/items`);
            testItem = itemsResponse.data.find(item => item.name === 'Test Stock Item');
            
            if (!testItem) {
                console.log('📝 Creating test item...');
                const newItemResponse = await axios.post(`${API_BASE}/items`, {
                    name: 'Test Stock Item',
                    hsnCode: '1234',
                    rate: 100,
                    taxSlab: 18,
                    units: 'pieces',
                    quantityInStock: 0
                });
                testItem = newItemResponse.data;
                console.log('✅ Test item created');
            }
        } catch (error) {
            console.log('❌ Error with items:', error.response?.data?.message || error.message);
            return;
        }

        console.log(`📊 Initial stock for "${testItem.name}": ${testItem.quantityInStock || 0}`);

        // Get or create test supplier
        let testSupplier;
        try {
            const suppliersResponse = await axios.get(`${API_BASE}/suppliers`);
            testSupplier = suppliersResponse.data.find(s => s.name === 'Test Stock Supplier');
            
            if (!testSupplier) {
                console.log('📝 Creating test supplier...');
                const newSupplierResponse = await axios.post(`${API_BASE}/suppliers`, {
                    name: 'Test Stock Supplier',
                    email: 'supplier@test.com',
                    phone: '+91 9876543210',
                    address: '123 Supplier Street',
                    gstin: '27ABCDE1234F1Z5'
                });
                testSupplier = newSupplierResponse.data;
                console.log('✅ Test supplier created');
            }
        } catch (error) {
            console.log('❌ Error with suppliers:', error.response?.data?.message || error.message);
            return;
        }

        // Create purchase order
        console.log('📦 Creating purchase order...');
        const purchaseData = {
            supplier: testSupplier._id,
            items: [{
                item: testItem._id,
                quantity: 15,
                purchasePrice: 80
            }],
            notes: 'Test purchase for stock verification'
        };

        try {
            const purchaseResponse = await axios.post(`${API_BASE}/purchases`, purchaseData);
            console.log('✅ Purchase order created successfully');
            console.log(`📋 Purchase ID: ${purchaseResponse.data._id}`);
        } catch (error) {
            console.log('❌ Error creating purchase:', error.response?.data?.message || error.message);
            console.log('Error details:', error.response?.data);
            return;
        }

        // Check updated stock
        try {
            const updatedItemResponse = await axios.get(`${API_BASE}/items/${testItem._id}`);
            const updatedStock = updatedItemResponse.data.quantityInStock;
            console.log(`📈 Stock after purchase: ${updatedStock}`);
            
            if (updatedStock === (testItem.quantityInStock || 0) + 15) {
                console.log('✅ Stock updated correctly!');
            } else {
                console.log(`❌ Stock not updated correctly. Expected: ${(testItem.quantityInStock || 0) + 15}, Got: ${updatedStock}`);
            }
        } catch (error) {
            console.log('❌ Error checking updated stock:', error.response?.data?.message || error.message);
        }

        console.log('\n🎉 Purchase stock flow test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testPurchaseStockFlow();
