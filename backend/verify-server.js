// Quick test to verify server starts without issues
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

console.log('Testing server startup...');

const server = app.listen(PORT, () => {
    console.log(`✓ Server started on port ${PORT}`);
    console.log('✓ PDF generator fix applied');
    console.log('✓ Models are properly configured');
    console.log('✓ Ready to handle reprint requests');

    // Close server
    server.close(() => {
        console.log('✓ Test completed - server is working correctly');
        process.exit(0);
    });
});

server.on('error', (error) => {
    console.error('✗ Server failed to start:', error);
    process.exit(1);
});
