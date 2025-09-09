require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

async function createIndexes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await Invoice.collection.createIndex({ invoiceDate: 1 });
        console.log('Created index on invoiceDate');

        await Invoice.collection.createIndex({ status: 1 });
        console.log('Created index on status');

        await Invoice.collection.createIndex({ invoiceType: 1 });
        console.log('Created index on invoiceType');

        await Invoice.collection.createIndex({ customer: 1 });
        console.log('Created index on customer');

        console.log('All indexes created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating indexes:', error);
        process.exit(1);
    }
}

createIndexes();
