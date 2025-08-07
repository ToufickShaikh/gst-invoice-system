const mongoose = require('mongoose');
const Item = require('./models/Item');
const Purchase = require('./models/Purchase');
const Supplier = require('./models/Supplier');

async function testStockSystem() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/gst-invoice-system');
        console.log('✅ Connected to MongoDB');

        // Check existing items
        const itemCount = await Item.countDocuments();
        console.log(`📦 Total items in database: ${itemCount}`);

        // Create a test supplier if needed
        let supplier = await Supplier.findOne({ name: 'Test Supplier' });
        if (!supplier) {
            supplier = new Supplier({
                name: 'Test Supplier',
                email: 'test@supplier.com',
                phone: '1234567890',
                address: '123 Test Street',
                gstin: '12ABCDE1234F1Z5'
            });
            await supplier.save();
            console.log('✅ Created test supplier');
        }

        // Create a test item with initial stock
        let testItem = await Item.findOne({ name: 'Test Product' });
        if (!testItem) {
            testItem = new Item({
                name: 'Test Product',
                hsnCode: '1234',
                rate: 100,
                taxSlab: 18,
                units: 'pieces',
                quantityInStock: 0
            });
            await testItem.save();
            console.log('✅ Created test item');
        }

        console.log(`📊 Initial stock for ${testItem.name}: ${testItem.quantityInStock}`);

        // Test purchase (should increase stock)
        const purchase = new Purchase({
            supplier: supplier._id,
            items: [{
                item: testItem._id,
                quantity: 10,
                purchasePrice: 80
            }],
            notes: 'Test purchase for stock verification'
        });

        await purchase.save();

        // Update stock after purchase
        await Item.findByIdAndUpdate(testItem._id, {
            $inc: { quantityInStock: 10 }
        });

        // Check updated stock
        const updatedItem = await Item.findById(testItem._id);
        console.log(`📈 Stock after purchase of 10 units: ${updatedItem.quantityInStock}`);

        // Test stock reduction (simulate sale)
        await Item.findByIdAndUpdate(testItem._id, {
            $inc: { quantityInStock: -3 }
        });

        const finalItem = await Item.findById(testItem._id);
        console.log(`📉 Stock after sale of 3 units: ${finalItem.quantityInStock}`);

        // Check all items with their stock levels
        const allItems = await Item.find({}).select('name quantityInStock hsnCode rate');
        console.log('\n📋 Current Inventory:');
        allItems.forEach((item, index) => {
            const stockStatus = item.quantityInStock <= 5 ? '⚠️ LOW' : '✅';
            console.log(`${index + 1}. ${item.name} - Stock: ${item.quantityInStock} ${stockStatus} - HSN: ${item.hsnCode} - Rate: ₹${item.rate}`);
        });

        console.log('\n✅ Stock system test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error testing stock system:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from MongoDB');
    }
}

testStockSystem();
