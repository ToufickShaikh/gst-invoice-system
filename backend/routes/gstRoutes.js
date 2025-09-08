// GST Verification and Filing Routes - Clean Version
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const company = require('../config/company');

// Utility function to parse period from request
const parsePeriod = (req) => {
  const { from, to } = req.query;
  if (!from || !to) {
    throw new Error('From and To dates are required');
  }
  const start = new Date(from);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// HSN summary
router.get('/returns/hsn-summary', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    console.log(`[HSN] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
    
    const invoices = await Invoice.find({ 
      invoiceDate: { $gte: start, $lte: end } 
    }).populate('items.item').lean();
    
    console.log(`[HSN] Found ${invoices.length} invoices`);

    // Process HSN data
    const hsnMap = new Map();
    
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const itemData = item.item || item;
        const hsnCode = itemData.hsnCode || 'NA';
        const taxRate = Number(item.taxSlab || item.taxRate || itemData.taxSlab || 0);
        const quantity = Number(item.quantity || 0);
        const taxableValue = Number(item.taxable || 0);
        const taxAmount = Number(item.tax || 0);
        
        const key = `${hsnCode}-${taxRate}`;
        if (!hsnMap.has(key)) {
          hsnMap.set(key, {
            hsn: hsnCode,
            description: itemData.name || itemData.description || 'Item',
            quantity: 0,
            taxRate,
            taxableValue: 0,
            taxAmount: 0
          });
        }
        
        const entry = hsnMap.get(key);
        entry.quantity += quantity;
        entry.taxableValue += taxableValue;
        entry.taxAmount += taxAmount;
      });
    });

    const rows = Array.from(hsnMap.values());
    const totals = rows.reduce((acc, row) => ({
      quantity: acc.quantity + row.quantity,
      taxableValue: acc.taxableValue + row.taxableValue,
      taxAmount: acc.taxAmount + row.taxAmount
    }), { quantity: 0, taxableValue: 0, taxAmount: 0 });

    res.json({
      period: { from: start, to: end },
      rows,
      totals
    });

  } catch (error) {
    console.error('HSN Summary generation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Document Summary - Shows list of all invoices with tax details
router.get('/returns/document-summary', async (req, res) => {
    try {
        const { start, end } = parsePeriod(req);
        console.log(`[Doc Summary] Processing period: ${start.toISOString()} to ${end.toISOString()}`);

        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end }
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

// GSTR1
router.get('/returns/gstr1', async (req, res) => {
    try {
        const { start, end } = parsePeriod(req);
        console.log(`[GSTR1] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
        
        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end }
        }).populate('customer', 'firmName gstin state');
        
        console.log(`[GSTR1] Found ${invoices.length} invoices`);

        // Group invoices by type (B2B, B2C Large, B2C Small)
        const b2b = [];
        const b2cl = [];
        const b2cs = [];

        invoices.forEach(inv => {
            const isB2B = inv.customer?.gstin;
            const amount = inv.grandTotal || 0;
            const isLarge = amount > 250000;

            const invoice = {
                inum: inv.invoiceNumber,
                idt: inv.invoiceDate?.toISOString().split('T')[0],
                val: amount,
                itms: (inv.items || []).map(item => ({
                    itm_det: {
                        txval: item.taxable || 0,
                        iamt: item.igst || 0,
                        camt: item.cgst || 0,
                        samt: item.sgst || 0,
                        rt: item.taxRate || 0
                    }
                }))
            };

            if (isB2B) {
                // Find or create party entry
                let party = b2b.find(p => p.ctin === inv.customer.gstin);
                if (!party) {
                    party = {
                        ctin: inv.customer.gstin,
                        inv: []
                    };
                    b2b.push(party);
                }
                party.inv.push(invoice);
            } else if (isLarge) {
                // Find or create party entry for B2C Large
                let party = b2cl.find(p => p.pos === inv.customer?.state);
                if (!party) {
                    party = {
                        pos: inv.customer?.state || '',
                        inv: []
                    };
                    b2cl.push(party);
                }
                party.inv.push(invoice);
            } else {
                // Aggregate B2C Small by state and tax rate
                const pos = inv.customer?.state || '';
                inv.items.forEach(item => {
                    const rt = item.taxRate || 0;
                    const key = `${pos}-${rt}`;
                    let entry = b2cs.find(e => e.pos === pos && e.rt === rt);
                    if (!entry) {
                        entry = {
                            pos,
                            rt,
                            txval: 0,
                            iamt: 0,
                            camt: 0,
                            samt: 0
                        };
                        b2cs.push(entry);
                    }
                    entry.txval += item.taxable || 0;
                    entry.iamt += item.igst || 0;
                    entry.camt += item.cgst || 0;
                    entry.samt += item.sgst || 0;
                });
            }
        });

        res.json({
            period: { from: start, to: end },
            b2b,
            b2cl,
            b2cs
        });

    } catch (error) {
        console.error('GSTR1 generation failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// GSTR3B
router.get('/returns/gstr3b', async (req, res) => {
    try {
        const { start, end } = parsePeriod(req);
        console.log(`[GSTR3B] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
        
        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end }
        }).lean();
        
        console.log(`[GSTR3B] Found ${invoices.length} invoices`);

        // Calculate summary
        const summary = invoices.reduce((acc, inv) => {
            acc.outwardTaxableSupplies += Number(inv.subTotal || 0);
            acc.igst += Number(inv.igst || 0);
            acc.cgst += Number(inv.cgst || 0);
            acc.sgst += Number(inv.sgst || 0);
            return acc;
        }, {
            outwardTaxableSupplies: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            exemptNil: 0
        });

        res.json({
            period: { from: start, to: end },
            summary
        });

    } catch (error) {
        console.error('GSTR3B generation failed:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
