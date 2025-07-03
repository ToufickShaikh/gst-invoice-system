const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Customer = require('../models/Customer'); // Import Customer model
const pdfGenerator = require('../utils/pdfGenerator');
const { calculateTotals } = require('../utils/taxHelpers');

// @desc    Create a new invoice
// @route   POST /api/billing/invoices
// @access  Private
const createInvoice = async (req, res) => {
    try {
        const {
            customer,
            items,
            discount = 0,
            shippingCharges = 0,
            totalBeforeTax = 0,
            totalTax = 0,
            grandTotal = 0,
            paidAmount = 0,
            balance = 0,
            paymentMethod = '',
            billingType = ''
        } = req.body;
        const invoiceNumber = `INV-${uuidv4()}`;

        // Calculate totalAmount as grandTotal (for reporting)
        const totalAmount = grandTotal;

        const invoice = new Invoice({
            invoiceNumber,
            customer,
            items,
            discount,
            shippingCharges,
            totalBeforeTax,
            totalTax,
            grandTotal,
            totalAmount,
            paidAmount,
            balance,
            paymentMethod,
            billingType
        });
        await invoice.save();

        // Optionally, generate PDF and return its path
        let pdfPath = null;
        try {
            pdfPath = await generatePdf(invoice);
        } catch (e) {
            console.error('PDF generation failed during creation:', e); // Log error
            // PDF generation failed, but invoice is saved
        }
        res.status(201).json({ invoice, pdfPath });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Update an existing invoice by ID
// @desc    Update an invoice
// @route   PUT /api/billing/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
    console.log('--- Starting Invoice Update Process ---');
    try {
        const { id } = req.params;
        const updatedData = req.body;
        console.log(`[1/6] Received request to update invoice ${id}`);
        console.log('[2/6] Request body:', JSON.stringify(updatedData, null, 2));

        // Ensure items have all necessary data for recalculation
        console.log('[3/6] Populating item data for recalculation...');
        const populatedItems = await Promise.all(
            updatedData.items.map(async (item) => {
                // The item object from the frontend might just have item._id and quantity
                if (item.rate && item.quantity && item.name) {
                    return item; // Item has what we need
                }
                // If data is missing, fetch the full item details from DB
                const itemDetails = await Item.findById(item.item || item._id);
                if (!itemDetails) {
                    // Throw an error if an item ID is invalid
                    throw new Error(`Item with ID ${item.item || item._id} not found.`);
                }
                return {
                    item: itemDetails._id,
                    name: itemDetails.name,
                    rate: itemDetails.rate,
                    quantity: item.quantity, // Quantity from the frontend
                };
            })
        );
        console.log('[3/6] Item data populated successfully.');

        updatedData.items = populatedItems;

        // Recalculate totals based on updated items
        console.log('[4/6] Recalculating invoice totals...');
        const { subTotal, taxAmount, totalAmount } = calculateTotals(
            updatedData.items,
            updatedData.customer.state // Pass customer state for tax calculation
        );

        updatedData.subTotal = subTotal;
        updatedData.cgst = taxAmount.cgst;
        updatedData.sgst = taxAmount.sgst;
        updatedData.igst = taxAmount.igst;
        updatedData.totalAmount = totalAmount;
        console.log('[4/6] Invoice totals recalculated.');
        console.log('Recalculated Totals:', { subTotal, taxAmount, totalAmount });


        // Perform the update in the database
        console.log(`[5/6] Updating invoice ${id} in the database...`);
        const updatedInvoice = await Invoice.findByIdAndUpdate(id, updatedData, {
            new: true,
            runValidators: true,
        })
            .populate('customer')
            .populate('items.item');

        if (!updatedInvoice) {
            console.error(`[ERROR] Invoice with ID ${id} not found for update.`);
            return res.status(404).json({ message: 'Invoice not found' });
        }
        console.log(`[5/6] Invoice ${id} updated successfully in DB.`);

        // After successful update, regenerate the PDF
        console.log(`[6/6] Regenerating PDF for invoice ${id}...`);
        await pdfGenerator.generateInvoicePDF(updatedInvoice);
        console.log(`[6/6] PDF for invoice ${id} regenerated.`);
        console.log('--- Invoice Update Process Finished ---');


        res.json(updatedInvoice);
    } catch (error) {
        console.error('--- [ERROR] Invoice Update Process Failed ---');
        console.error('Error details:', error);
        res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
};

// Regenerate PDF for an existing invoice
const reprintInvoice = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await Invoice.findById(invoiceId).populate('customer').populate('items.item');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const pdfPath = await generatePdf(invoice);
        res.json({ pdfPath, message: 'Invoice reprinted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Dashboard stats endpoint
const getDashboardStats = async (req, res) => {
    console.log('Fetching dashboard stats...');
    try {
        const totalInvoices = await Invoice.countDocuments();
        const totalCustomers = await Customer.countDocuments();

        const invoiceData = await Invoice.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalPaid: { $sum: '$paidAmount' },
                },
            },
        ]);

        const stats = {
            totalInvoices,
            totalCustomers,
            totalRevenue: invoiceData[0]?.totalRevenue || 0,
            totalPaid: invoiceData[0]?.totalPaid || 0,
            balanceDue: (invoiceData[0]?.totalRevenue || 0) - (invoiceData[0]?.totalPaid || 0),
        };
        console.log('Dashboard stats fetched successfully:', stats);
        res.json(stats);
    } catch (error) {
        console.error('[ERROR] Failed to fetch dashboard stats:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
};

/**
 * @desc    Generate QR code for payment
 * @route   GET /api/billing/invoices/:id/payment-qr
 * @access  Private
 */
const generatePaymentQr = async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const balance = (invoice.grandTotal || 0) - (invoice.paidAmount || 0);

        if (balance <= 0) {
            return res.status(400).json({ message: 'Invoice is already fully paid' });
        }

        const upiId = 'shaikhtool@ibl'; // Hardcoded UPI ID
        const { qrCodeImage } = await generateUpiQr(upiId, balance.toFixed(2));

        res.json({ qrCodeImage });

    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Get a single invoice by ID
const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer').populate('items.item');
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// Get all invoices
const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find().populate('customer').populate('items.item');
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    reprintInvoice,
    getDashboardStats,
    generatePaymentQr,
};
