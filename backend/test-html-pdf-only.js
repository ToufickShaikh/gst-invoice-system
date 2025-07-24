const htmlPdf = require('html-pdf-node');
const fs = require('fs').promises;
const path = require('path');

async function testHtmlPdfNode() {
    console.log('Testing html-pdf-node...');

    const testHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Invoice</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            .content { margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Test Invoice</h1>
            <p>Invoice #: TEST-001</p>
        </div>
        <div class="content">
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Customer:</strong> Test Customer</p>
            <p><strong>Amount:</strong> ₹118.00</p>
        </div>
    </body>
    </html>
    `;

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
            displayHeaderFooter: false,
            timeout: 30000
        };

        console.log('Generating PDF with html-pdf-node...');
        const file = { content: testHtml };
        const pdfBuffer = await htmlPdf.generatePdf(file, options);

        const outputPath = path.join(__dirname, 'test-html-pdf-output.pdf');
        await fs.writeFile(outputPath, pdfBuffer);

        console.log('✅ SUCCESS: PDF generated');
        console.log(`   File size: ${pdfBuffer.length} bytes`);
        console.log(`   Saved to: ${outputPath}`);

        return true;

    } catch (error) {
        console.log('❌ FAILED: html-pdf-node error');
        console.log(`   Error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
        return false;
    }
}

testHtmlPdfNode().then(success => {
    if (success) {
        console.log('\n🎉 html-pdf-node is working! This should fix the PDF generation.');
    } else {
        console.log('\n❌ html-pdf-node is also failing. We need a different approach.');
    }
}).catch(console.error);
