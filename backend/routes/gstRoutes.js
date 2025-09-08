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
    const { start, end } = parsePeriod(req);
    console.log(`[GSTR-1] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
    
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } })
      .populate('customer')
      .populate('items.item')
      .lean();
    console.log(`[GSTR-1] Found ${invoices.length} invoices`);

    const compCode = getStateCode(company.state || '');
    const b2bMap = new Map(), b2clMap = new Map(), b2csAgg = new Map();
    const exp = [];
    let gt = 0, cur_gt = 0;

    for (const inv of invoices) {
      console.log(`[GSTR-1] Processing invoice ${inv.invoiceNumber}, customer:`, inv.customer ? 'present' : 'missing');
      
      // Handle missing customer data - assume B2C domestic if no customer
      const cust = inv.customer || { customerType: 'B2C', state: company.state || 'Tamil Nadu' };
      let custState = cust.state;
      
      if (!custState && cust.address) {
        const stateMatch = cust.address.match(/,?\s*([A-Za-z\s]+)\s*-?\s*\d{6}/);
        if (stateMatch) custState = stateMatch[1].trim();
      }
      
      // Default to company state if customer state is missing
      if (!custState) {
        custState = company.state || 'Tamil Nadu';
        console.log(`[GSTR-1] Using company state ${custState} for invoice ${inv.invoiceNumber}`);
      }
      
      const pos = getStateCode(custState);
      const inter = pos && compCode && pos !== compCode;
      
      const subTotal = Number(inv.subTotal || inv.itemTotal || 0);
      const igst = Number(inv.igst || inv.totalIGST || 0);
      const cgst = Number(inv.cgst || inv.totalCGST || 0);
      const sgst = Number(inv.sgst || inv.totalSGST || 0);
      
      let total = Number(inv.grandTotal || inv.totalAmount || inv.total || 0);
      if (!total || total === 0) {
        total = subTotal + igst + cgst + sgst;
      }
      
      console.log(`[GSTR-1] Invoice ${inv.invoiceNumber}: customer=${cust.name || cust.firmName || 'Unknown'}, state=${custState}, pos=${pos}, inter=${inter}, subTotal=${subTotal}, taxes=${igst+cgst+sgst}, total=${total}`);
      cur_gt += total;

      const itms = (inv.items || []).map((li, idx) => {
        const qty = Number(li.quantity || 0);
        const rate = Number(li.rate || li.sellingPrice || 0);
        let txval = qty * rate;
        
        if (li.discount) {
          const discountAmount = (Number(li.discount) / 100) * txval;
          txval = txval - discountAmount;
        }
        
        const rt = Number(li.taxSlab || li.taxRate || li.item?.taxSlab || li.item?.taxRate || 18);
        const taxAmt = txval * rt / 100;
        
        const split = inter ? 
          { iamt: taxAmt, camt: 0, samt: 0 } : 
          { iamt: 0, camt: taxAmt / 2, samt: taxAmt / 2 };
        
        return {
          num: idx + 1,
          itm_det: {
            hsn_sc: li.hsnCode || li.item?.hsnCode || '9999',
            txval: +txval.toFixed(2),
            rt: +rt.toFixed(2),
            iamt: +split.iamt.toFixed(2),
            camt: +split.camt.toFixed(2),
            samt: +split.samt.toFixed(2),
            csamt: 0
          }
        };
      });

      const invRow = {
        inum: inv.invoiceNumber,
        idt: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0,10) : '',
        val: +total.toFixed(2),
        pos: pos || compCode || '33', // Default to Tamil Nadu
        rchrg: 'N',
        inv_typ: 'R',
        itms
      };

      if (inv.exportInfo && inv.exportInfo.isExport) {
        const exp_typ = (inv.exportInfo.exportType || '').toUpperCase() === 'SEZ' ? 'SEZ' : 'WPAY';
        const sply_ty = inv.exportInfo.withTax ? 'WPAY' : 'WOPAY';
        exp.push({
          exp_typ,
          inv: [{ 
            ...invRow, 
            sbpcode: inv.exportInfo.portCode || '', 
            sbnum: inv.exportInfo.shippingBillNo || '', 
            sbdt: inv.exportInfo.shippingBillDate ? new Date(inv.exportInfo.shippingBillDate).toISOString().slice(0,10) : '', 
            sply_ty 
          }]
        });
        console.log(`[GSTR-1] Added Export invoice: ${inv.invoiceNumber}`);
        continue;
      }

      // Determine customer GSTIN - check multiple possible fields
      const custGstin = cust.gstin || cust.gstNo || cust.gstNumber || cust.gst;
      const isB2B = cust.customerType === 'B2B' || custGstin;
      
      if (isB2B && custGstin) {
        const ctin = custGstin;
        if (!b2bMap.has(ctin)) b2bMap.set(ctin, { ctin, inv: [] });
        b2bMap.get(ctin).inv.push(invRow);
        console.log(`[GSTR-1] Added B2B invoice for GSTIN: ${ctin}`);
      } else {
        if (inter && total > 250000) {
          const key = pos || '33';
          if (!b2clMap.has(key)) b2clMap.set(key, { pos: key, inv: [] });
          b2clMap.get(key).inv.push(invRow);
          console.log(`[GSTR-1] Added B2CL invoice for state: ${key}, value: ${total}`);
        } else {
          for (const it of itms) {
            const k = `${pos||'33'}|${it.itm_det.rt}|${inter ? 'INTER' : 'INTRA'}`;
            if (!b2csAgg.has(k)) b2csAgg.set(k, {
              sply_ty: inter ? 'INTER' : 'INTRA',
              typ: 'OE',
              pos: pos || compCode || '33',
              rt: it.itm_det.rt,
              txval: 0,
              iamt: 0, camt: 0, samt: 0, csamt: 0
            });
            const row = b2csAgg.get(k);
            row.txval = +(row.txval + it.itm_det.txval).toFixed(2);
            row.iamt = +(row.iamt + it.itm_det.iamt).toFixed(2);
            row.camt = +(row.camt + it.itm_det.camt).toFixed(2);
            row.samt = +(row.samt + it.itm_det.samt).toFixed(2);
          }
          console.log(`[GSTR-1] Added B2CS aggregation for POS: ${pos||compCode||'33'}, invoice: ${inv.invoiceNumber}`);
        }
      }
    }

    const payload = {
      gstin: company.gstin || '',
      fp: getFp(start),
      version: 'GST3.0',
      gt: +gt.toFixed(2),
      cur_gt: +cur_gt.toFixed(2),
      b2b: Array.from(b2bMap.values()),
      b2cl: Array.from(b2clMap.values()),
      b2cs: Array.from(b2csAgg.values()),
      cdnr: [],
      cdnur: [],
      exp
    };

    console.log(`[GSTR-1] Generated payload: B2B=${payload.b2b.length}, B2CL=${payload.b2cl.length}, B2CS=${payload.b2cs.length}, Export=${payload.exp.length}, Total=${cur_gt}`);

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const csvData = [['Type', 'GSTIN/POS', 'Invoice Number', 'Date', 'Value', 'Taxable Value', 'IGST', 'CGST', 'SGST']];
      payload.b2b.forEach(party => {
        party.inv.forEach(invoice => {
          invoice.itms.forEach(item => {
            csvData.push(['B2B', party.ctin, invoice.inum, invoice.idt, invoice.val, item.itm_det.txval, item.itm_det.iamt, item.itm_det.camt, item.itm_det.samt]);
          });
        });
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=gstr1-${start.toISOString().slice(0,10)}-${end.toISOString().slice(0,10)}.csv`);
      return res.send(asCsv(csvData));
    }

    res.json(payload);
  } catch (error) {
    console.error('[GST] GSTR-1 error', error);
    res.status(500).json({ error: 'Failed to compute GSTR-1', details: error.message });
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

// HSN summary
router.get('/returns/hsn-summary', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    console.log(`[HSN] Processing period: ${start.toISOString()} to ${end.toISOString()}`);
    
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).populate('items.item').lean();
    console.log(`[HSN] Found ${invoices.length} invoices`);
    
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
