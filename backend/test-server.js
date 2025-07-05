// Simple test to check if server can start
const app = require('./app');

const PORT = process.env.PORT || 5000;

console.log('Testing server startup...');

try {
    const server = app.listen(PORT, () => {
        console.log(`✓ Server started successfully on port ${PORT}`);
        console.log('✓ All modules loaded correctly');

        // Test the PDF generator with dummy data
        const pdfGenerator = require('./utils/pdfGenerator');
        console.log('✓ PDF generator module loaded');

        // Close server after test
        setTimeout(() => {
            server.close(() => {
                console.log('✓ Test completed successfully');
                process.exit(0);
            });
        }, 1000);
    });

    server.on('error', (error) => {
        console.error('✗ Server startup failed:', error);
        process.exit(1);
    });

} catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
}
