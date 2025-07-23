const puppeteer = require('puppeteer');
const htmlPdf = require('html-pdf-node');
const fs = require('fs').promises;
const path = require('path');

async function testPDFGeneration() {
    console.log('=== Testing PDF Generation Methods ===');
    
    const testHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test PDF</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { color: blue; }
        </style>
    </head>
    <body>
        <h1 class="header">Test PDF Generation</h1>
        <p>This is a test PDF to check if generation is working.</p>
        <p>Current time: ${new Date().toISOString()}</p>
    </body>
    </html>
    `;

    // Test 1: Puppeteer
    console.log('\n1. Testing Puppeteer...');
    try {
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
        
        const page = await browser.newPage();
        await page.setContent(testHtml, { 
            waitUntil: 'networkidle2',
            timeout: 10000 
        });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            }
        });
        
        await browser.close();
        
        const puppeteerPath = path.join(__dirname, 'test-puppeteer.pdf');
        await fs.writeFile(puppeteerPath, pdfBuffer);
        
        console.log('✅ Puppeteer: SUCCESS - PDF generated');
        console.log(`   File size: ${pdfBuffer.length} bytes`);
        console.log(`   Saved to: ${puppeteerPath}`);
        
    } catch (error) {
        console.log('❌ Puppeteer: FAILED');
        console.log(`   Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
    }

    // Test 2: html-pdf-node
    console.log('\n2. Testing html-pdf-node...');
    try {
        const options = {
            format: 'A4',
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            },
            printBackground: true,
            timeout: 30000
        };

        const file = { content: testHtml };
        const pdfBuffer = await htmlPdf.generatePdf(file, options);
        
        const htmlPdfPath = path.join(__dirname, 'test-html-pdf-node.pdf');
        await fs.writeFile(htmlPdfPath, pdfBuffer);
        
        console.log('✅ html-pdf-node: SUCCESS - PDF generated');
        console.log(`   File size: ${pdfBuffer.length} bytes`);
        console.log(`   Saved to: ${htmlPdfPath}`);
        
    } catch (error) {
        console.log('❌ html-pdf-node: FAILED');
        console.log(`   Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
    }

    // Test 3: Environment Check
    console.log('\n3. Environment Check...');
    console.log(`   Node.js version: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
    
    // Check if we're in a serverless environment
    console.log(`   Environment variables:`);
    console.log(`     NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`     VERCEL: ${process.env.VERCEL}`);
    console.log(`     RENDER: ${process.env.RENDER}`);
    console.log(`     PORT: ${process.env.PORT}`);
}

testPDFGeneration().catch(console.error);
