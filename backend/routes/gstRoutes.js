// GST Verification and Filing Routes - Clean Version
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const company = require('../config/company');

// GST Verification functions
const verifyGSTIN = async (req, res) => {
    try {
        const { gstin } = req.params;
        console.log('[GST API] Verification request for GSTIN:', gstin);
        if (!gstin) {
            return res.status(400).json({ success: false, error: 'GSTIN is required' });
        }
        const result = await verifyAndAutoFillGST(gstin);
        if (!result.success) {
            return res.status(400).json({ verified: false, error: result.error });
        }
        const response = {
            verified: true,
            companyDetails: {
                gstin: result.gstin,
                legalName: result.autoFillFields.firmName,
                tradeName: result.autoFillFields.tradeName,
                principalPlaceOfBusiness: result.autoFillFields.firmAddress,
                state: result.autoFillFields.state,
                stateCode: result.autoFillFields.stateCode,
                registrationDate: result.companyDetails?.registrationDate || new Date().toISOString().split('T')[0],
                status: 'Active'
            },
            taxType: result.taxInfo?.type || result.taxInfo
        };
        res.json(response);
    } catch (error) {
        console.error('[GST API] Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error during GST verification' });
    }
};

const quickValidateGSTIN = async (req, res) => {
    try {
        const { gstin } = req.params;
        const validation = validateGSTIN(gstin);
        if (validation.valid) {
            const taxInfo = determineTaxType(validation.stateCode);
            res.json({
                valid: true,
                gstin: validation.gstin,
                stateCode: validation.stateCode,
                stateName: validation.stateName,
                taxInfo: taxInfo
            });
        } else {
            res.status(400).json(validation);
        }
    } catch (error) {
        console.error('[GST API] Validation error:', error);
        res.status(500).json({ valid: false, error: 'Validation service error' });
    }
};

const getTaxType = async (req, res) => {
    try {
        const { fromState, toState } = req.query;
        if (!fromState || !toState) {
            return res.status(400).json({ error: 'Both fromState and toState are required' });
        }
        const taxInfo = determineTaxType(fromState, toState);
        res.json(taxInfo);
    } catch (error) {
        console.error('[GST API] Tax type error:', error);
        res.status(500).json({ error: 'Tax type determination failed' });
    }
};

// Helper functions for GST filing calculations
const parsePeriod = (req) => {
  const { from, to } = req.query;
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let end = to ? new Date(to) : new Date();
  
  // If end date is provided, set it to end of day (23:59:59.999)
  if (to) {
    end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
};

const getStateCode = (stateStr) => {
  if (!stateStr) return null;
  if (stateStr.includes('-')) return stateStr.split('-')[0].trim();
  if (/^\d{2}$/.test(stateStr)) return stateStr;
  const stateCodeMap = {
    'Tamil Nadu': '33', 'TN': '33', 'Maharashtra': '27', 'MH': '27', 'Karnataka': '29', 'KA': '29',
    'Kerala': '32', 'KL': '32', 'Andhra Pradesh': '28', 'AP': '28', 'Telangana': '36', 'TG': '36',
    'Gujarat': '24', 'GJ': '24', 'Rajasthan': '08', 'RJ': '08', 'Uttar Pradesh': '09', 'UP': '09',
    'West Bengal': '19', 'WB': '19', 'Delhi': '07', 'DL': '07', 'Haryana': '06', 'HR': '06',
    'Punjab': '03', 'PB': '03'
  };
  return stateCodeMap[stateStr] || null;
};

const getFp = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const asCsv = (rows) => {
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
};

// GSTR-1 - Enhanced sales data for portal upload
router.get('/returns/gstr1', async (req, res) => {
    try {
        // Get date range from query
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ 
                error: 'Missing date range', 
                message: 'Both from and to dates are required' 
            });
        }

        const start = new Date(from);
        const end = new Date(to);
        
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ 
                error: 'Invalid date format',
                message: 'Please use YYYY-MM-DD format' 
            });
        }

        // Set end of day for end date
        end.setHours(23, 59, 59, 999);

        // Fetch invoices
        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end },
            status: { $ne: 'CANCELLED' }
        })
        .populate('customer', 'firmName gstin state billingAddress')
        .populate('items.item', 'name hsnCode taxSlab')
        .lean();

        // Group invoices by type
        const b2b = [];
        const b2cl = [];
        const b2cs = [];
        let totalValue = 0;

        // Process each invoice
        invoices.forEach(inv => {
            const isB2B = inv.customer?.gstin;
            const amount = Number(inv.grandTotal || 0);
            totalValue += amount;
            const isLarge = amount > 250000;

            // Format invoice data
            const invoice = {
                inum: inv.invoiceNumber,
                idt: inv.invoiceDate.toISOString().split('T')[0],
                val: amount,
                pos: (inv.customer?.state || '27').substring(0, 2),
                rchrg: inv.reverseCharge ? 'Y' : 'N',
                inv_typ: inv.invoiceType === 'EXPORT' ? 'EXPWP' : 'R',
                itms: (inv.items || []).map(item => ({
                    itm_det: {
                        txval: Number(item.taxable || 0),
                        iamt: Number(item.igst || 0),
                        camt: Number(item.cgst || 0),
                        samt: Number(item.sgst || 0),
                        rt: Number(item.taxSlab || item.taxRate || item.item?.taxSlab || 0)
                    }
                }))
            };

            // Add to appropriate section
            if (isB2B) {
                let party = b2b.find(p => p.ctin === inv.customer.gstin);
                if (!party) {
                    party = { ctin: inv.customer.gstin, inv: [] };
                    b2b.push(party);
                }
                party.inv.push(invoice);
            } else if (isLarge) {
                let state = b2cl.find(p => p.pos === invoice.pos);
                if (!state) {
                    state = { pos: invoice.pos, inv: [] };
                    b2cl.push(state);
                }
                state.inv.push(invoice);
            } else {
                // Aggregate B2C Small by state and rate
                inv.items.forEach(item => {
                    const rt = Number(item.taxSlab || item.taxRate || item.item?.taxSlab || 0);
                    const pos = invoice.pos;
                    let entry = b2cs.find(e => e.pos === pos && e.rt === rt);
                    if (!entry) {
                        entry = {
                            sply_ty: 'INTRA',
                            pos,
                            rt,
                            txval: 0,
                            iamt: 0,
                            camt: 0,
                            samt: 0
                        };
                        b2cs.push(entry);
                    }
                    entry.txval += Number(item.taxable || 0);
                    entry.iamt += Number(item.igst || 0);
                    entry.camt += Number(item.cgst || 0);
                    entry.samt += Number(item.sgst || 0);
                });
            }
        });

        // Calculate summary
        const summary = {
            totalInvoices: invoices.length,
            counts: {
                b2b: b2b.reduce((acc, curr) => acc + curr.inv.length, 0),
                b2cl: b2cl.reduce((acc, curr) => acc + curr.inv.length, 0),
                b2cs: b2cs.length
            },
            totals: {
                taxableValue: invoices.reduce((acc, inv) => acc + (inv.subTotal || 0), 0),
                igst: invoices.reduce((acc, inv) => acc + (inv.igst || 0), 0),
                cgst: invoices.reduce((acc, inv) => acc + (inv.cgst || 0), 0),
                sgst: invoices.reduce((acc, inv) => acc + (inv.sgst || 0), 0)
            }
        };

        // Send response
        res.json({
            gstr1: {
                gstin: company.gstin,
                ret_period: `${start.getFullYear()}${(start.getMonth() + 1).toString().padStart(2, '0')}`,
                gt: totalValue,
                b2b,
                b2cl,
                b2cs
            },
            summary,
            period: { from: start, to: end }
        });

    } catch (error) {
        console.error('[GSTR1] Error:', error);
        res.status(500).json({ 
            error: 'Failed to generate GSTR1',
            message: error.message 
        });
    }
});

// GSTR-3B summary
router.get('/returns/gstr3b', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    console.log(`[GSTR-3B] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
    
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).lean();
    console.log(`[GSTR-3B] Found ${invoices.length} invoices`);

    let taxable = 0, igst = 0, cgst = 0, sgst = 0;
    
    for (const inv of invoices) {
      const invTaxable = Number(inv.subTotal || inv.itemTotal || 0);
      const invIgst = Number(inv.igst || inv.totalIGST || 0);
      const invCgst = Number(inv.cgst || inv.totalCGST || 0);
      const invSgst = Number(inv.sgst || inv.totalSGST || 0);
      
      taxable += invTaxable;
      igst += invIgst;
      cgst += invCgst;
      sgst += invSgst;
      
      console.log(`[GSTR-3B] Invoice ${inv.invoiceNumber}: taxable=${invTaxable}, igst=${invIgst}, cgst=${invCgst}, sgst=${invSgst}`);
      
      // If invoice has no tax totals, calculate from items
      if (!invIgst && !invCgst && !invSgst && inv.items && inv.items.length > 0) {
        console.log(`[GSTR-3B] Calculating taxes from items for ${inv.invoiceNumber}`);
        for (const li of inv.items) {
          const qty = Number(li.quantity || 0);
          const rate = Number(li.rate || 0);
          const lineTotal = qty * rate;
          const taxRate = Number(li.taxSlab || li.item?.taxSlab || 0) / 100;
          const lineTax = lineTotal * taxRate;
          
          // Simple assumption: if customer has different state, it's IGST, otherwise split CGST/SGST
          if (inv.customer && inv.customer.state && inv.customer.state !== (company.state || 'Tamil Nadu')) {
            igst += lineTax;
          } else {
            cgst += lineTax / 2;
            sgst += lineTax / 2;
          }
        }
      }
    }

    const summary = { 
      outwardTaxableSupplies: +taxable.toFixed(2), 
      igst: +igst.toFixed(2), 
      cgst: +cgst.toFixed(2), 
      sgst: +sgst.toFixed(2), 
      exemptNil: 0 
    };

    console.log(`[GSTR-3B] Final summary:`, summary);

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const csvData = [
        ['Description', 'Value'],
        ['Outward Taxable Supplies', summary.outwardTaxableSupplies],
        ['IGST', summary.igst], ['CGST', summary.cgst], ['SGST', summary.sgst],
        ['Exempt/Nil Rated', summary.exemptNil]
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=gstr3b-${start.toISOString().slice(0,10)}-${end.toISOString().slice(0,10)}.csv`);
      return res.send(asCsv(csvData));
    }

    res.json({ period: { from: start, to: end }, summary });
  } catch (error) {
    console.error('[GST] GSTR-3B error', error);
    res.status(500).json({ error: 'Failed to compute GSTR-3B', details: error.message });
  }
});

// HSN summary
router.get('/returns/hsn-summary', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    console.log(`[HSN] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
    
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).populate('items.item').lean();
    console.log(`[HSN] Found ${invoices.length} invoices`);

    const hsnMap = new Map();
    for (const inv of invoices) {
      for (const li of inv.items || []) {
        const hsn = li.hsnCode || li.item?.hsnCode || 'NA';
        const name = li.item?.name || li.name || '';
        const qty = Number(li.quantity || 0);
        const rate = Number(li.rate || li.sellingPrice || 0);
        let txval = qty * rate;
        if (li.discount) {
          txval = txval - ((Number(li.discount) / 100) * txval);
        }
        const taxRate = Number(li.taxSlab || li.taxRate || li.item?.taxSlab || li.item?.taxRate || 0);
        const taxAmt = txval * taxRate / 100;
        
        if (!hsnMap.has(hsn)) {
          hsnMap.set(hsn, { hsn, description: name, quantity: 0, taxableValue: 0, taxAmount: 0, taxRate });
        }
        
        const row = hsnMap.get(hsn);
        row.quantity += qty;
        row.taxableValue += txval;
        row.taxAmount += taxAmt;
        row.taxRate = Math.max(row.taxRate, taxRate);
      }
    }
    
    const rows = Array.from(hsnMap.values()).map(row => ({
      ...row,
      quantity: +row.quantity.toFixed(2),
      taxableValue: +row.taxableValue.toFixed(2),
      taxAmount: +row.taxAmount.toFixed(2),
      taxRate: +row.taxRate.toFixed(2)
    }));

    console.log(`[HSN] Generated ${rows.length} HSN rows`);

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const header = ['HSN', 'Description', 'Quantity', 'Tax Rate %', 'Taxable Value', 'Tax Amount'];
      const data = rows.map(r => [r.hsn, r.description, r.quantity, r.taxRate, r.taxableValue, r.taxAmount]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=hsn-summary-${start.toISOString().slice(0,10)}-${end.toISOString().slice(0,10)}.csv`);
      return res.send(asCsv([header, ...data]));
    }

    res.json({ period: { from: start, to: end }, count: rows.length, rows });
  } catch (error) {
    console.error('[GST] HSN summary error', error);
    res.status(500).json({ error: 'Failed to compute HSN summary', details: error.message });
  }
});

// Document summary endpoint for GST filings with optimized performance
router.get('/returns/document-summary', async (req, res) => {
  try {
    console.time('[GST] Document summary generation');
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'Missing date range', 
        message: 'Both from and to dates are required' 
      });
    }

    const start = new Date(from);
    const end = new Date(to);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        message: 'Please use YYYY-MM-DD format' 
      });
    }

    // Set end of day for end date
    end.setHours(23, 59, 59, 999);

    // Use aggregation pipeline for better performance
    const [result] = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: start, $lte: end }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $unwind: {
          path: '$customerInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ['$grandTotal', 0] } },
          b2b: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$status', 'CANCELLED'] },
                  { $ne: ['$invoiceType', 'EXPORT'] },
                  { $ifNull: ['$customerInfo.gstin', false] }
                ]},
                1,
                0
              ]
            }
          },
          b2c: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$status', 'CANCELLED'] },
                  { $ne: ['$invoiceType', 'EXPORT'] },
                  { $not: { $ifNull: ['$customerInfo.gstin', false] } }
                ]},
                1,
                0
              ]
            }
          },
          export: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$status', 'CANCELLED'] },
                  { $eq: ['$invoiceType', 'EXPORT'] }
                ]},
                1,
                0
              ]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0]
            }
          },
          documents: {
            $push: {
              invoiceNumber: '$invoiceNumber',
              date: '$invoiceDate',
              type: {
                $cond: [
                  { $ifNull: ['$customerInfo.gstin', false] },
                  'B2B',
                  'B2C'
                ]
              },
              partyName: {
                $ifNull: ['$customerInfo.firmName', 'Walk-in Customer']
              },
              value: { $ifNull: ['$grandTotal', 0] },
              status: { $ifNull: ['$status', 'ACTIVE'] }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          summary: {
            totalDocuments: '$totalDocuments',
            totalValue: { $round: ['$totalValue', 2] },
            b2b: '$b2b',
            b2c: '$b2c',
            export: '$export',
            cancelled: '$cancelled',
            documentList: {
              $slice: ['$documents', 100] // Limit to last 100 documents for better performance
            }
          }
        }
      }
    ]);

    console.timeEnd('[GST] Document summary generation');

    // Send response
    res.json({
      period: { from: start, to: end },
      summary: result?.summary || {
        totalDocuments: 0,
        totalValue: 0,
        b2b: 0,
        b2c: 0,
        export: 0,
        cancelled: 0,
        documentList: []
      }
    });

  } catch (error) {
    console.error('[GST] Document summary error:', error);
    res.status(500).json({ 
      error: 'Failed to generate document summary',
      message: error.message 
    });
  }
});

// Debug endpoint to inspect invoices used for GST calculations
router.get('/returns/debug', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } })
      .populate('customer')
      .populate('items.item')
      .limit(50)
      .lean();
      
    const samples = invoices.slice(0, 10).map(inv => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      itemsCount: (inv.items || []).length,
      subTotal: inv.subTotal,
      cgst: inv.cgst, sgst: inv.sgst, igst: inv.igst,
      grandTotal: inv.grandTotal,
      customerRef: inv.customer, // Raw customer reference
      customerPopulated: !!inv.customer, // Whether customer exists
      customer: {
        _id: inv.customer?._id,
        name: inv.customer?.firmName || inv.customer?.name,
        state: inv.customer?.state,
        gstin: inv.customer?.gstin || inv.customer?.gstNo
      }
    }));

    res.json({ 
      period: { from: start, to: end }, 
      count: invoices.length, 
      companyStateCode: getStateCode(company.state || 'Tamil Nadu'),
      samples 
    });
  } catch (err) {
    console.error('[GST DEBUG] Error', err);
    res.status(500).json({ error: 'Failed to run GST debug' });
  }
});

// Define verification routes
router.get('/verify/:gstin', verifyGSTIN);
router.get('/validate/:gstin', quickValidateGSTIN);
router.get('/tax-type', getTaxType);

module.exports = router;
