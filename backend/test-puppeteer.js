const puppeteer = require('puppeteer');

async function testPuppeteer() {
    console.log('Testing Puppeteer installation and functionality...');
    
    try {
        console.log('1. Attempting to launch browser...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            timeout: 30000
        });
        
        console.log('✅ Browser launched successfully');
        
        console.log('2. Creating new page...');
        const page = await browser.newPage();
        
        console.log('3. Setting page content...');
        await page.setContent(`
            <html>
                <head>
                    <title>Test PDF</title>
                </head>
                <body>
                    <h1>Test PDF Generation</h1>
                    <p>This is a test PDF to verify Puppeteer is working.</p>
                </body>
            </html>
        `, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        });
        
        console.log('4. Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });
        
        console.log(`✅ PDF generated successfully! Size: ${pdfBuffer.length} bytes`);
        
        await browser.close();
        console.log('✅ Browser closed successfully');
        
        // Try to save the test PDF
        const fs = require('fs');
        const path = require('path');
        
        const testPdfPath = path.join(__dirname, 'invoices', 'test-pdf.pdf');
        
        // Ensure invoices directory exists
        const invoicesDir = path.join(__dirname, 'invoices');
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
            console.log('✅ Created invoices directory');
        }
        
        fs.writeFileSync(testPdfPath, pdfBuffer);
        console.log(`✅ Test PDF saved to: ${testPdfPath}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Puppeteer test failed:', error);
        console.error('Error details:');
        console.error('- Message:', error.message);
        console.error('- Stack:', error.stack);
        return false;
    }
}

// Run the test
testPuppeteer()
    .then(success => {
        if (success) {
            console.log('\n🎉 Puppeteer is working correctly!');
            console.log('The issue might be elsewhere in the PDF generation pipeline.');
        } else {
            console.log('\n💥 Puppeteer is not working properly.');
            console.log('This explains why HTML files are being served instead of PDFs.');
        }
    })
    .catch(error => {
        console.error('\n💥 Test execution failed:', error);
    });
