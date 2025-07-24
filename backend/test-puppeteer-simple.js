const puppeteer = require('puppeteer');

async function testPuppeteerOnly() {
    console.log('Testing Puppeteer only...');

    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        console.log('Browser launched successfully');
        console.log('Creating new page...');
        const page = await browser.newPage();

        console.log('Setting content...');
        await page.setContent('<html><body><h1>Test</h1></body></html>');

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({ format: 'A4' });

        console.log('Closing browser...');
        await browser.close();

        console.log(`SUCCESS: PDF generated with ${pdfBuffer.length} bytes`);

    } catch (error) {
        console.log('ERROR:', error.message);
        console.log('STACK:', error.stack);
    }
}

testPuppeteerOnly();
