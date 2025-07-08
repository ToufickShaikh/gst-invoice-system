// Simple health check script to test if backend can start
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔍 Backend Health Check Starting...');
console.log('Environment Variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- PORT:', process.env.PORT || '3000');
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

// Test basic Express app creation
try {
    const app = express();
    console.log('✅ Express app created successfully');
    
    // Test CORS
    const cors = require('cors');
    app.use(cors());
    console.log('✅ CORS middleware loaded');
    
    // Test body parser
    const bodyParser = require('body-parser');
    app.use(bodyParser.json());
    console.log('✅ Body parser middleware loaded');
    
    // Test basic route
    app.get('/health', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    console.log('✅ Basic route created');
    
    // Test if we can import the main models
    const Customer = require('./models/Customer');
    const Invoice = require('./models/Invoice');
    const Item = require('./models/Item');
    console.log('✅ Models imported successfully');
    
    // Test utility imports
    const pdfGenerator = require('./utils/pdfGenerator');
    const { calculateTotals } = require('./utils/taxHelpers');
    console.log('✅ Utility functions imported successfully');
    
    // Test database connection
    const connectDB = require('./config/db');
    connectDB().then(() => {
        console.log('✅ Database connection test passed');
        
        // Try to start the server
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`✅ Server started successfully on port ${PORT}`);
            console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
            console.log('✅ Backend is healthy and ready!');
            
            // Close server after test
            setTimeout(() => {
                server.close(() => {
                    console.log('✅ Health check completed - server closed');
                    process.exit(0);
                });
            }, 2000);
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
        
    }).catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.log('⚠️  Server can still run without database for basic functionality');
        
        // Try to start server without database
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, () => {
            console.log(`⚠️  Server started WITHOUT database on port ${PORT}`);
            console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
            
            // Close server after test
            setTimeout(() => {
                server.close(() => {
                    console.log('⚠️  Health check completed - server closed (no database)');
                    process.exit(0);
                });
            }, 2000);
        });
        
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
            process.exit(1);
        });
    });
    
} catch (error) {
    console.error('❌ Critical error during health check:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
