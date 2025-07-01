
// Make sure to run this script from the project root with the correct Node.js version.
console.log('Script started');

import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;


async function resetAdmin() {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        const email = 'admin@example.com';
        const password = 'admin123';
        const db = mongoose.connection.db;
        console.log('Connected to DB:', db.databaseName);
        // Use the User model to ensure correct collection and schema
        const delResult = await User.deleteMany({ email });
        console.log('Deleted:', delResult.deletedCount, 'users');
        const newUser = await User.create({ email, password });
        console.log('Inserted user:', newUser);
        console.log('Admin user reset. Email: ' + email + ' Password: ' + password);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error during admin reset:', err);
        process.exit(1);
    }
}

// Actually run the function
resetAdmin();


