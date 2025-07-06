const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, 'invoices', 'invoice-TEST-PDF-001.pdf');

if (fs.existsSync(pdfPath)) {
    const buffer = fs.readFileSync(pdfPath);
    const header = buffer.toString('ascii', 0, 8);

    console.log('📄 File Analysis:');
    console.log(`File size: ${buffer.length} bytes`);
    console.log(`File header: "${header}"`);

    if (header.startsWith('%PDF')) {
        console.log('✅ This is a valid PDF file!');
        console.log('🎉 PDF generation is working correctly!');
    } else {
        console.log('❌ This is not a valid PDF file');
        console.log('First 50 bytes as hex:', buffer.slice(0, 50).toString('hex'));
    }
} else {
    console.log('❌ PDF file not found');
}
