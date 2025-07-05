// Quick test of HTML cleanup scheduling
const fs = require('fs/promises');
const path = require('path');

async function quickCleanupTest() {
    console.log('🧪 Quick test: HTML cleanup scheduling...');

    // Create a test HTML file
    const testDir = path.resolve(__dirname, 'invoices');
    await fs.mkdir(testDir, { recursive: true });

    const testHtmlPath = path.join(testDir, 'test-cleanup.html');
    await fs.writeFile(testHtmlPath, '<html><body>Test cleanup</body></html>', 'utf-8');

    console.log('✅ Created test HTML file:', testHtmlPath);

    // Test the cleanup function directly
    const scheduleHtmlCleanup = (htmlPath, invoiceNumber) => {
        setTimeout(async () => {
            try {
                await fs.unlink(htmlPath);
                console.log(`✅ Successfully deleted HTML file for invoice ${invoiceNumber} after 5 seconds (test)`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.warn(`❌ Failed to delete HTML file:`, error.message);
                }
            }
        }, 5000); // 5 seconds for quick test

        console.log(`⏰ Scheduled HTML cleanup for invoice ${invoiceNumber} in 5 seconds`);
    };

    // Schedule cleanup
    scheduleHtmlCleanup(testHtmlPath, 'TEST-01');

    // Verify file exists now
    try {
        await fs.access(testHtmlPath);
        console.log('✅ Test HTML file exists initially');
    } catch (error) {
        console.log('❌ Test file not found');
    }
}

quickCleanupTest();
