// backend/server.js
// Entry point for starting the backend server
import app from './app.js';
import connectDB from './config/db.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

connectDB(); // Connect to MongoDB

const PORT = process.env.PORT || 3000;

// Start the Express server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});