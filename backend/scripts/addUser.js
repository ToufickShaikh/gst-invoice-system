import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGO_URI;

const addUser = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const newUser = new User({
            username: 'hokage4',
            password: 'admin',
        });

        await newUser.save();
    } catch (error) {
        console.error('Error adding user:', error);
    } finally {
        mongoose.disconnect();
    }
};

addUser();
