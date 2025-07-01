// backend/app.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import billingRoutes from './routes/billingRoutes.js';

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('GST Billing Backend is running!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/billing', billingRoutes);

// Serve generated invoices statically
app.use('/invoices', express.static('invoices'));

export default app;