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

// Format invoice number for GSTR1 (remove special characters)
const formatInvoiceNumber = (invoiceNumber) => {
    return invoiceNumber.replace(/[^a-zA-Z0-9]/g, '');
};

// Format date for GSTR1 (DD-MM-YYYY)
const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
};

// Get place of supply code
const getPOS = (state) => {
    // Return 2-digit state code, default to company state if not found
    const stateCode = state ? state.substring(0, 2) : (company.state || '').substring(0, 2);
    return stateCode || '27'; // Default to Maharashtra if no state found
};

// Get reverse charge status
const getReverseCharge = (invoice) => {
    return invoice.reverseCharge === true ? 'Y' : 'N';
};

router.get('/returns/gstr1', async (req, res) => {
    try {
        const { start, end } = parsePeriod(req);
        console.log(`[GSTR1] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
        
        // Fetch all invoices with complete customer and item details
        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end },
            status: { $ne: 'CANCELLED' } // Exclude cancelled invoices
        })
        .populate('customer', 'firmName gstin state billingAddress')
        .populate('items.item', 'name hsnCode taxSlab')
        .lean();
        
        console.log(`[GSTR1] Found ${invoices.length} invoices`);

        // Initialize sections as per GSTR1 format
        const gstr1Data = {
            gstin: company.gstin,
            fp: formatDate(start).substring(3), // MMM-YYYY
            version: "GST3.0.4",
            b2b: [], // B2B Invoices
            b2cl: [], // B2C Large Invoices (Above 2.5L)
            b2cs: [], // B2C Small Consolidated
            cdnr: [], // Credit/Debit Notes Registered
            cdnur: [], // Credit/Debit Notes Unregistered
            exp: [], // Exports
            hsn: {
                data: []
            }
        };

        // Process each invoice
        invoices.forEach(inv => {
            const isB2B = inv.customer?.gstin;
            const amount = Number(inv.grandTotal || 0);
            const isLarge = amount > 250000;
            const pos = getPOS(inv.customer?.state);

            // Prepare common invoice data
            const invoiceData = {
                inum: formatInvoiceNumber(inv.invoiceNumber),
                idt: formatDate(new Date(inv.invoiceDate)),
                val: amount.toFixed(2),
                pos,
                rchrg: getReverseCharge(inv),
                inv_typ: inv.invoiceType === 'EXPORT' ? 'EXPWP' : 'R', // Regular or Export with payment
                itms: []
            };

            // Process items with proper rate-wise tax amounts
            const rateWiseItems = new Map(); // Group items by tax rate

            (inv.items || []).forEach(item => {
                const rate = Number(item.taxSlab || item.taxRate || item.item?.taxSlab || 0);
                const taxable = Number(item.taxable || 0);
                const igst = Number(item.igst || 0);
                const cgst = Number(item.cgst || 0);
                const sgst = Number(item.sgst || 0);

                const key = rate.toString();
                if (!rateWiseItems.has(key)) {
                    rateWiseItems.set(key, {
                        num: 1,
                        rt: rate,
                        txval: 0,
                        iamt: 0,
                        camt: 0,
                        samt: 0
                    });
                }

                const entry = rateWiseItems.get(key);
                entry.txval += taxable;
                entry.iamt += igst;
                entry.camt += cgst;
                entry.samt += sgst;
            });

            // Convert rate-wise items to GSTR1 format
            invoiceData.itms = Array.from(rateWiseItems.values()).map(item => ({
                num: item.num,
                itm_det: {
                    rt: item.rt,
                    txval: item.txval.toFixed(2),
                    iamt: item.iamt.toFixed(2),
                    camt: item.camt.toFixed(2),
                    samt: item.samt.toFixed(2)
                }
            }));

            if (isB2B) {
                // B2B invoice handling
                let party = gstr1Data.b2b.find(p => p.ctin === inv.customer.gstin);
                if (!party) {
                    party = {
                        ctin: inv.customer.gstin,
                        inv: []
                    };
                    gstr1Data.b2b.push(party);
                }
                party.inv.push(invoiceData);
            } else if (isLarge) {
                // B2C Large invoice handling
                let stateGroup = gstr1Data.b2cl.find(p => p.pos === pos);
                if (!stateGroup) {
                    stateGroup = {
                        pos,
                        inv: []
                    };
                    gstr1Data.b2cl.push(stateGroup);
                }
                stateGroup.inv.push(invoiceData);
            } else {
                // B2C Small consolidation
                rateWiseItems.forEach((value, rate) => {
                    const key = `${pos}-${rate}`;
                    let entry = gstr1Data.b2cs.find(e => e.pos === pos && e.rt === Number(rate));
                    
                    if (!entry) {
                        entry = {
                            sply_ty: "INTRA",
                            pos,
                            rt: Number(rate),
                            txval: 0,
                            iamt: 0,
                            camt: 0,
                            samt: 0,
                            csamt: 0
                        };
                        gstr1Data.b2cs.push(entry);
                    }

                    entry.txval += Number(value.txval);
                    entry.iamt += Number(value.iamt);
                    entry.camt += Number(value.camt);
                    entry.samt += Number(value.samt);
                });
            }
        });

        // Round all decimal values to 2 places
        const roundSection = (section) => {
            if (Array.isArray(section)) {
                section.forEach(entry => {
                    Object.keys(entry).forEach(key => {
                        if (typeof entry[key] === 'number') {
                            entry[key] = Number(entry[key].toFixed(2));
                        }
                    });
                });
            }
        };

        // Round values in all sections
        roundSection(gstr1Data.b2cs);
        gstr1Data.b2b.forEach(b2b => roundSection(b2b.inv));
        gstr1Data.b2cl.forEach(b2cl => roundSection(b2cl.inv));

        // Add summary statistics
        const summary = {
            totalInvoices: invoices.length,
            b2bCount: gstr1Data.b2b.reduce((acc, curr) => acc + curr.inv.length, 0),
            b2clCount: gstr1Data.b2cl.reduce((acc, curr) => acc + curr.inv.length, 0),
            b2csCount: gstr1Data.b2cs.length
        };

        res.json({
            gstr1: gstr1Data,
            summary,
            period: { from: start, to: end }
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
