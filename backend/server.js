// backend/server.js
// Entry point for starting the backend server
const app = require('./app.js');
const connectDB = require('./config/db.js');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

connectDB(); // Connect to MongoDB

const PORT = process.env.PORT || 3000;

// Start the Express server
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});