import Invoice from '../models/Invoice.js';
import { v4 as uuidv4 } from 'uuid';
import { generatePdf } from '../utils/pdfGenerator.js';

export const createInvoice = async (req, res) => {
    try {
        const { customer, items, discount, paidAmount } = req.body;
        const invoiceNumber = `INV-${uuidv4()}`;

        // Simplified total calculation, detailed logic in taxHelpers.js
        const totalAmount = items.reduce((acc, i) => acc + i.item.price * i.quantity, 0);
        const invoice = new Invoice({
            invoiceNumber,
            customer,
            items,
            discount,
            totalAmount,
            paidAmount,
        });
        await invoice.save();

        const pdfPath = await generatePdf(invoice);
        res.status(201).json({ invoice, pdfPath });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};