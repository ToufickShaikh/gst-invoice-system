import express from 'express';
import { PDFGenerator } from './generator';
import { Bill } from './types/bill';

const app = express();
const port = 3000;
const pdfGenerator = new PDFGenerator();

app.use(express.json());

app.post('/generate-bill', async (req, res) => {
    const billData: Bill = req.body;

    try {
        const pdfBuffer = await pdfGenerator.generatePDF(billData);
        const filePath = `./bills/${billData.id}.pdf`;
        await pdfGenerator.savePDF(pdfBuffer, filePath);
        res.status(200).send({ message: 'Bill generated successfully', filePath });
    } catch (error) {
        res.status(500).send({ message: 'Error generating bill', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`PDF Bill Generator running at http://localhost:${port}`);
});