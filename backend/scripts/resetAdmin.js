import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gst-invoice-system';

async function resetAdmin() {
    await mongoose.connect(MONGO_URI);
    const email = 'admin@example.com';
    const password = 'admin123';
    await User.deleteMany({ email });
    await User.create({ email, password });
    console.log('Admin user reset. Email: ' + email + ' Password: ' + password);
    await mongoose.disconnect();
}

resetAdmin();
