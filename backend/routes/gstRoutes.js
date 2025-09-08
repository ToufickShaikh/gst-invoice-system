// GST Verification and Filing Routes - Clean Version
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const company = require('../config/company');

// Utility function to parse and validate period from request
const parsePeriod = (req) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      throw new Error('From and To dates are required');
    }

    // Parse dates
    const start = new Date(from);
    const end = new Date(to);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format');
    }

    // Validate date range
    if (end < start) {
      throw new Error('End date cannot be before start date');
    }

    const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    if (monthDiff > 1) {
      throw new Error('Date range cannot exceed 1 month');
    }

    // Set time to end of day for end date
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } catch (error) {
    error.statusCode = 400; // Bad Request
    throw error;
  }
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

// Utility functions for GSTR1 data formatting
const formatInvoiceNumber = (invoiceNumber) => {
    if (!invoiceNumber) return '';
    return invoiceNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16); // Max 16 chars as per GSTR1 spec
};

// Format date for GSTR1 (DD-MM-YYYY)
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
};

// Get financial year and period
const getFinancialYearAndMonth = (date) => {
    const d = new Date(date);
    const month = d.getMonth(); // 0-11
    const year = d.getFullYear();
    const financialYear = month >= 3 ? year : year - 1; // April onwards is new FY
    const periodMonth = month >= 3 ? month - 3 : month + 9; // Convert to FY month (0-11)
    return {
        fy: `${financialYear}-${(financialYear + 1).toString().slice(2)}`,
        month: periodMonth + 1 // 1-12
    };
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
        
        // Validate company GSTIN
        if (!company.gstin) {
            throw new Error('Company GSTIN not configured');
        }

        // Fetch all invoices with complete customer and item details
        const invoices = await Invoice.find({
            invoiceDate: { $gte: start, $lte: end },
            status: { $ne: 'CANCELLED' } // Exclude cancelled invoices
        })
        .populate('customer', 'firmName gstin state billingAddress')
        .populate('items.item', 'name hsnCode taxSlab')
        .lean()
        .catch(error => {
            console.error('[GSTR1] Database error:', error);
            throw new Error('Failed to fetch invoices from database');
        });
        
        console.log(`[GSTR1] Found ${invoices.length} invoices`);

        // Get financial year and period details
        const { fy, month } = getFinancialYearAndMonth(start);
        
        // Initialize sections as per GSTR1 format
        const gstr1Data = {
            gstin: company.gstin,
            ret_period: `${fy}${month.toString().padStart(2, '0')}`, // Format: 2023-24[01-12]
            fp: formatDate(start).substring(3), // MM-YYYY
            version: "GST3.1.5",
            gt: 0, // Aggregate turnover for the period
            cur_gt: 0, // Current period turnover
            b2b: [], // B2B Invoices
            b2ba: [], // B2B Amendments
            b2cl: [], // B2C Large Invoices (Above 2.5L)
            b2cla: [], // B2C Large Amendments
            b2cs: [], // B2C Small Consolidated
            b2csa: [], // B2C Small Amendments
            cdnr: [], // Credit/Debit Notes Registered
            cdnra: [], // Credit/Debit Notes Registered Amendments
            cdnur: [], // Credit/Debit Notes Unregistered
            cdnura: [], // Credit/Debit Notes Unregistered Amendments
            exp: [], // Exports
            expa: [], // Export Amendments
            hsn: {
                data: []
            },
            nil: { // Nil rated, exempted and non GST supplies
                inv: []
            },
            doc_issue: { // Document issue details
                doc_det: []
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

            // Process items with proper rate-wise tax amounts and HSN details
            const rateWiseItems = new Map(); // Group items by tax rate
            const hsnItems = new Map(); // Group items by HSN code

            // Track total value for grand total calculation
            gstr1Data.cur_gt += Number(inv.grandTotal || 0);

            (inv.items || []).forEach(item => {
                const itemData = item.item || {};
                const rate = Number(item.taxSlab || item.taxRate || itemData.taxSlab || 0);
                const taxable = Number(item.taxable || 0);
                const igst = Number(item.igst || 0);
                const cgst = Number(item.cgst || 0);
                const sgst = Number(item.sgst || 0);
                const quantity = Number(item.quantity || 0);
                const hsnCode = itemData.hsnCode || '00000000';
                const uqc = item.unit || 'NOS'; // Unit of measurement

                // Process rate-wise aggregation
                const key = rate.toString();
                if (!rateWiseItems.has(key)) {
                    rateWiseItems.set(key, {
                        num: 1,
                        rt: rate,
                        txval: 0,
                        iamt: 0,
                        camt: 0,
                        samt: 0,
                        csamt: 0 // Cess amount if applicable
                    });
                }

                const entry = rateWiseItems.get(key);
                entry.txval += taxable;
                entry.iamt += igst;
                entry.camt += cgst;
                entry.samt += sgst;

                // Process HSN-wise aggregation
                const hsnKey = `${hsnCode}-${rate}`;
                if (!hsnItems.has(hsnKey)) {
                    hsnItems.set(hsnKey, {
                        num: 1,
                        hsn_sc: hsnCode,
                        desc: itemData.name || 'Goods',
                        uqc,
                        qty: 0,
                        rt: rate,
                        txval: 0,
                        iamt: 0,
                        camt: 0,
                        samt: 0,
                        csamt: 0
                    });
                }

                const hsnEntry = hsnItems.get(hsnKey);
                hsnEntry.qty += quantity;
                hsnEntry.txval += taxable;
                hsnEntry.iamt += igst;
                hsnEntry.camt += cgst;
                hsnEntry.samt += sgst;
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

        // Add HSN summary data
        gstr1Data.hsn.data = Array.from(hsnItems.values()).map(item => ({
            num: item.num,
            hsn_sc: item.hsn_sc,
            desc: item.desc,
            uqc: item.uqc,
            qty: Number(item.qty.toFixed(2)),
            val: Number((item.txval + item.iamt + item.camt + item.samt).toFixed(2)),
            txval: Number(item.txval.toFixed(2)),
            iamt: Number(item.iamt.toFixed(2)),
            camt: Number(item.camt.toFixed(2)),
            samt: Number(item.samt.toFixed(2)),
            csamt: Number(item.csamt.toFixed(2))
        }));

        // Set the grand total (current period turnover)
        gstr1Data.gt = Number(gstr1Data.cur_gt.toFixed(2));

        // Round all decimal values to 2 places and ensure proper number formatting
        const roundSection = (section) => {
            if (Array.isArray(section)) {
                section.forEach(entry => {
                    Object.keys(entry).forEach(key => {
                        if (typeof entry[key] === 'number') {
                            entry[key] = Number(Number(entry[key]).toFixed(2));
                        }
                        // Convert string numbers to proper format
                        if (typeof entry[key] === 'string' && !isNaN(entry[key])) {
                            entry[key] = Number(Number(entry[key]).toFixed(2));
                        }
                    });
                });
            }
        };

        // Round values in all sections
        roundSection(gstr1Data.b2cs);
        gstr1Data.b2b.forEach(b2b => roundSection(b2b.inv));
        gstr1Data.b2cl.forEach(b2cl => roundSection(b2cl.inv));
        roundSection(gstr1Data.hsn.data);

        // Calculate section-wise totals
        const sectionTotals = {
            b2b: gstr1Data.b2b.reduce((acc, curr) => {
                curr.inv.forEach(inv => {
                    acc.taxable += Number(inv.val || 0);
                    inv.itms.forEach(item => {
                        acc.igst += Number(item.itm_det.iamt || 0);
                        acc.cgst += Number(item.itm_det.camt || 0);
                        acc.sgst += Number(item.itm_det.samt || 0);
                    });
                });
                return acc;
            }, { taxable: 0, igst: 0, cgst: 0, sgst: 0 }),
            b2cl: gstr1Data.b2cl.reduce((acc, curr) => {
                curr.inv.forEach(inv => {
                    acc.taxable += Number(inv.val || 0);
                    inv.itms.forEach(item => {
                        acc.igst += Number(item.itm_det.iamt || 0);
                        acc.cgst += Number(item.itm_det.camt || 0);
                        acc.sgst += Number(item.itm_det.samt || 0);
                    });
                });
                return acc;
            }, { taxable: 0, igst: 0, cgst: 0, sgst: 0 }),
            b2cs: gstr1Data.b2cs.reduce((acc, curr) => {
                acc.taxable += Number(curr.txval || 0);
                acc.igst += Number(curr.iamt || 0);
                acc.cgst += Number(curr.camt || 0);
                acc.sgst += Number(curr.samt || 0);
                return acc;
            }, { taxable: 0, igst: 0, cgst: 0, sgst: 0 })
        };

        // Add comprehensive summary statistics
        const summary = {
            totalInvoices: invoices.length,
            counts: {
                b2b: gstr1Data.b2b.reduce((acc, curr) => acc + curr.inv.length, 0),
                b2cl: gstr1Data.b2cl.reduce((acc, curr) => acc + curr.inv.length, 0),
                b2cs: gstr1Data.b2cs.length,
                hsn: gstr1Data.hsn.data.length
            },
            totals: {
                taxableValue: Number((sectionTotals.b2b.taxable + sectionTotals.b2cl.taxable + sectionTotals.b2cs.taxable).toFixed(2)),
                igst: Number((sectionTotals.b2b.igst + sectionTotals.b2cl.igst + sectionTotals.b2cs.igst).toFixed(2)),
                cgst: Number((sectionTotals.b2b.cgst + sectionTotals.b2cl.cgst + sectionTotals.b2cs.cgst).toFixed(2)),
                sgst: Number((sectionTotals.b2b.sgst + sectionTotals.b2cl.sgst + sectionTotals.b2cs.sgst).toFixed(2))
            },
            sectionTotals
        };

        // Add document numbering summary
        const docSummary = {
            fromNumber: '',
            toNumber: '',
            totalDocs: invoices.length,
            cancelled: 0,
            netIssued: invoices.length
        };

        if (invoices.length > 0) {
            const sortedInvoices = [...invoices].sort((a, b) => 
                (a.invoiceNumber || '').localeCompare(b.invoiceNumber || ''));
            docSummary.fromNumber = sortedInvoices[0].invoiceNumber;
            docSummary.toNumber = sortedInvoices[sortedInvoices.length - 1].invoiceNumber;
        }

        gstr1Data.doc_issue.doc_det.push({
            doc_num: 1,
            doc_typ: 'INV',
            from: docSummary.fromNumber,
            to: docSummary.toNumber,
            totnum: docSummary.totalDocs,
            cancel: docSummary.cancelled,
            net_issue: docSummary.netIssued
        });

        res.json({
            gstr1: gstr1Data,
            summary,
            docSummary,
            period: { 
                from: start, 
                to: end,
                fy,
                month
            }
        });

    } catch (error) {
        console.error('[GSTR1] Generation failed:', error);
        const statusCode = error.statusCode || 500;
        const errorResponse = {
            error: true,
            message: error.message || 'Internal server error occurred while generating GSTR1',
            code: error.code || 'GSTR1_GENERATION_FAILED',
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                cause: error.cause
            } : undefined
        };
        res.status(statusCode).json(errorResponse);
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
