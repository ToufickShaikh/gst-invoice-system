const pdfGenerator = require('./utils/pdfGenerator');
const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

// Test PDF generation with logo, signature and QR code
async function testPdfGeneration() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/gst-invoice', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Find a recent invoice to test with
        const invoice = await Invoice.findOne()
            .populate('customer')
            .populate('items.item')
            .sort({ createdAt: -1 });

        if (!invoice) {
            console.log('No invoices found for testing');
            return;
        }

        console.log(`Testing PDF generation for invoice: ${invoice.invoiceNumber}`);
        console.log(`Balance amount: ₹${invoice.balance || 0}`);

        const pdfPath = await pdfGenerator.generateInvoicePDF(invoice);
        console.log(`PDF generated successfully: ${pdfPath}`);

        mongoose.connection.close();
    } catch (error) {
        console.error('Test failed:', error);
        mongoose.connection.close();
    }
}

testPdfGeneration();
