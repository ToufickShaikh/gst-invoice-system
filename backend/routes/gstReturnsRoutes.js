const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { parsePeriod } = require('../utils/dateHelpers');

// Document Summary - Shows list of all invoices with tax details
router.get('/returns/document-summary', async (req, res) => {
    try {
        const { start, end } = parsePeriod(req);
        console.log(`[Doc Summary] Processing period: ${start.toISOString()} to ${end.toISOString()}`);

        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end },
            status: { $ne: 'CANCELLED' }
        }).populate('customer', 'firmName gstin state').lean();
        
        console.log(`[Doc Summary] Found ${invoices.length} invoices`);

        const documents = invoices.map(inv => ({
            date: inv.invoiceDate,
            number: inv.invoiceNumber,
            type: inv.invoiceType || 'INVOICE',
            party: {
                name: inv.customer?.firmName || 'Walk-in Customer',
                gstin: inv.customer?.gstin || '',
                state: inv.customer?.state || ''
            },
            placeOfSupply: inv.customer?.state || '',
            taxableValue: inv.subTotal || 0,
            igst: inv.igst || 0,
            cgst: inv.cgst || 0,
            sgst: inv.sgst || 0,
            total: inv.grandTotal || 0,
            status: inv.status || 'COMPLETED'
        }));

        // Calculate summary statistics
        const summary = documents.reduce((acc, doc) => ({
            totalInvoices: acc.totalInvoices + 1,
            totalTaxableValue: acc.totalTaxableValue + doc.taxableValue,
            totalIgst: acc.totalIgst + doc.igst,
            totalCgst: acc.totalCgst + doc.cgst,
            totalSgst: acc.totalSgst + doc.sgst,
            totalAmount: acc.totalAmount + doc.total
        }), {
            totalInvoices: 0,
            totalTaxableValue: 0,
            totalIgst: 0,
            totalCgst: 0,
            totalSgst: 0,
            totalAmount: 0
        });

        res.json({
            period: { from: start, to: end },
            documents,
            summary,
            totalCount: documents.length
        });

    } catch (error) {
        console.error('Document Summary generation failed:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
