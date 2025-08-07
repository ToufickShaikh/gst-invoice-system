const mongoose = require('mongoose');
const Item = require('./models/Item');

async function testItemStockUpdate() {
    try {
        console.log('🧪 Testing Item Stock Update...');
        
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/gst-invoice-system');
        console.log('✅ Connected to MongoDB');

        // Create a test item
        let testItem = await Item.findOne({ name: 'Stock Test Item' });
        if (!testItem) {
            testItem = new Item({
                name: 'Stock Test Item',
                hsnCode: '9999',
                rate: 100,
                taxSlab: 18,
                units: 'per piece',
                quantityInStock: 0
            });
            await testItem.save();
            console.log('✅ Created test item');
        }

        console.log(`📊 Initial stock: ${testItem.quantityInStock}`);

        // Test direct stock update
        console.log('🔄 Testing direct stock update...');
        const updatedItem = await Item.findByIdAndUpdate(
            testItem._id,
            { $inc: { quantityInStock: 10 } },
            { new: true }
        );

        if (updatedItem) {
            console.log(`✅ Stock update successful: ${updatedItem.quantityInStock}`);
        } else {
            console.log('❌ Failed to update stock');
        }

        // Test with ObjectId conversion
        console.log('🔄 Testing with ObjectId conversion...');
        const updatedItem2 = await Item.findByIdAndUpdate(
            new mongoose.Types.ObjectId(testItem._id),
            { $inc: { quantityInStock: 5 } },
            { new: true }
        );

        if (updatedItem2) {
            console.log(`✅ ObjectId update successful: ${updatedItem2.quantityInStock}`);
        } else {
            console.log('❌ Failed to update with ObjectId');
        }

        // Check final stock
        const finalItem = await Item.findById(testItem._id);
        console.log(`📈 Final stock: ${finalItem.quantityInStock}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
    }
}

testItemStockUpdate();
