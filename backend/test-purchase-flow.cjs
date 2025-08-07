const mongoose = require('mongoose');
const Item = require('./models/Item');
const Purchase = require('./models/Purchase');
const Supplier = require('./models/Supplier');

async function testPurchaseCreationFlow() {
    try {
        console.log('🧪 Testing Purchase Creation Flow...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/gst-invoice-system');
        console.log('✅ Connected to MongoDB');

        // Create or get test supplier
        let testSupplier = await Supplier.findOne({ name: 'Test Purchase Supplier' });
        if (!testSupplier) {
            testSupplier = new Supplier({
                name: 'Test Purchase Supplier',
                email: 'purchase@test.com',
                phone: '+91 1234567890',
                address: '123 Test Address',
                gstin: '27ABCDE1234F1Z5'
            });
            await testSupplier.save();
            console.log('✅ Created test supplier:', testSupplier._id);
        } else {
            console.log('✅ Using existing supplier:', testSupplier._id);
        }

        // Create or get test item
        let testItem = await Item.findOne({ name: 'Test Purchase Item' });
        if (!testItem) {
            testItem = new Item({
                name: 'Test Purchase Item',
                hsnCode: '1111',
                rate: 150,
                taxSlab: 18,
                units: 'per piece',
                quantityInStock: 0
            });
            await testItem.save();
            console.log('✅ Created test item:', testItem._id);
        } else {
            console.log('✅ Using existing item:', testItem._id);
        }

        console.log(`📊 Initial stock for ${testItem.name}: ${testItem.quantityInStock}`);

        // Simulate the exact data structure from frontend
        const purchaseData = {
            supplier: testSupplier._id.toString(), // Frontend sends as string
            items: [
                {
                    item: testItem._id.toString(), // Frontend sends as string
                    quantity: 20, // Frontend processes to number
                    purchasePrice: 120.50 // Frontend processes to number
                }
            ],
            notes: 'Test purchase creation flow'
        };

        console.log('📦 Creating purchase with data:', JSON.stringify(purchaseData, null, 2));

        // Create purchase (similar to controller logic)
        const purchase = new Purchase(purchaseData);
        await purchase.save();
        console.log('✅ Purchase saved:', purchase._id);

        // Update stock (exactly as in controller)
        for (const purchasedItem of purchaseData.items) {
            console.log(`🔄 Updating stock for item ${purchasedItem.item}, quantity: ${purchasedItem.quantity}`);
            
            // Check if item ID is valid
            if (!mongoose.Types.ObjectId.isValid(purchasedItem.item)) {
                console.error(`❌ Invalid ObjectId: ${purchasedItem.item}`);
                continue;
            }
            
            const updatedItem = await Item.findByIdAndUpdate(
                purchasedItem.item, 
                { $inc: { quantityInStock: purchasedItem.quantity } },
                { new: true }
            );
            
            if (updatedItem) {
                console.log(`✅ Stock updated for ${updatedItem.name}: ${updatedItem.quantityInStock}`);
            } else {
                console.error(`❌ Failed to find item with ID: ${purchasedItem.item}`);
            }
        }

        // Verify final stock
        const finalItem = await Item.findById(testItem._id);
        console.log(`📈 Final stock for ${finalItem.name}: ${finalItem.quantityInStock}`);

        if (finalItem.quantityInStock === testItem.quantityInStock + 20) {
            console.log('🎉 Purchase stock update test PASSED!');
        } else {
            console.log('❌ Purchase stock update test FAILED!');
            console.log(`Expected: ${testItem.quantityInStock + 20}, Got: ${finalItem.quantityInStock}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
    }
}

testPurchaseCreationFlow();
