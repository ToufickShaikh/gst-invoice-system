const Invoice = require('../models/Invoice');
const { formatDate } = require('../utils/dateHelpers');

exports.getGstr1 = async (req, res) => {
    try {
        // Existing GSTR-1 logic
    } catch (error) {
        console.error('GSTR-1 generation failed:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getGstr3b = async (req, res) => {
    try {
        // Existing GSTR-3B logic
    } catch (error) {
        console.error('GSTR-3B generation failed:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getHsnSummary = async (req, res) => {
    try {
        // Existing HSN Summary logic
    } catch (error) {
        console.error('HSN Summary generation failed:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getDocumentSummary = async (req, res) => {
    try {
        const { from, to } = req.query;
        
        if (!from || !to) {
            return res.status(400).json({ error: 'From and To dates are required' });
        }

        const startDate = new Date(from);
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999); // Include the entire 'to' date

        const invoices = await Invoice.find({
            invoiceDate: { $gte: startDate, $lte: endDate }
        }).populate('customer', 'firmName gstin state');

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
            period: { from, to },
            documents,
            summary,
            totalCount: documents.length
        });

    } catch (error) {
        console.error('Document Summary generation failed:', error);
        res.status(500).json({ error: error.message });
    }
};
