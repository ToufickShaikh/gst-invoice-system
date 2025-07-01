import PDFDocument from 'pdfkit';
import fs from 'fs';

export const generatePdf = (invoice) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const pdfPath = `invoices/invoice-${invoice.invoiceNumber}.pdf`;
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        doc.fontSize(25).text(`Invoice #${invoice.invoiceNumber}`, { align: 'center' });
        doc.end();

        writeStream.on('finish', () => resolve(pdfPath));
        writeStream.on('error', reject);
    });
};