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

        const matchStage = {
            invoiceDate: { $gte: startDate, $lte: endDate },
        };

        // Use an aggregation pipeline for efficiency
        const results = await Invoice.aggregate([
            { $match: matchStage },
            { $sort: { invoiceDate: 1 } },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customerInfo'
                }
            },
            { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    documents: {
                        $push: {
                            date: '$invoiceDate',
                            number: '$invoiceNumber',
                            type: { $ifNull: ['$invoiceType', 'INVOICE'] },
                            party: {
                                name: { $ifNull: ['$customerInfo.firmName', 'Walk-in Customer'] },
                                gstin: { $ifNull: ['$customerInfo.gstin', ''] },
                                state: { $ifNull: ['$customerInfo.state', ''] }
                            },
                            placeOfSupply: { $ifNull: ['$customerInfo.state', ''] },
                            taxableValue: { $ifNull: ['$subTotal', 0] },
                            igst: { $ifNull: ['$igst', 0] },
                            cgst: { $ifNull: ['$cgst', 0] },
                            sgst: { $ifNull: ['$sgst', 0] },
                            total: { $ifNull: ['$grandTotal', 0] },
                            status: { $ifNull: ['$status', 'COMPLETED'] }
                        }
                    },
                    totalInvoices: { $sum: 1 },
                    totalTaxableValue: { $sum: { $ifNull: ['$subTotal', 0] } },
                    totalIgst: { $sum: { $ifNull: ['$igst', 0] } },
                    totalCgst: { $sum: { $ifNull: ['$cgst', 0] } },
                    totalSgst: { $sum: { $ifNull: ['$sgst', 0] } },
                    totalAmount: { $sum: { $ifNull: ['$grandTotal', 0] } }
                }
            },
            { $project: { _id: 0 } } // Remove the _id field from the final output
        ]);

        // Aggregation returns an array, we need the first element or a default object
        const data = results[0] || { documents: [], totalInvoices: 0, totalTaxableValue: 0, totalIgst: 0, totalCgst: 0, totalSgst: 0, totalAmount: 0 };
        const { documents, ...summary } = data;

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
