// backend/app.js
// Main Express app setup for GST Invoice System backend
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
// Import route handlers
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import billingRoutes from './routes/billingRoutes.js';

const app = express(); // Create Express app instance

// Middleware setup
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON request bodies

// Health check route
app.get('/', (req, res) => {
    res.send('GST Billing Backend is running!');
});

// API Routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/customers', customerRoutes); // Customer management routes
app.use('/api/items', itemRoutes); // Item management routes
app.use('/api/billing', billingRoutes); // Billing/invoice routes

// Serve generated invoices as static files
app.use('/invoices', express.static('invoices'));

export default app;