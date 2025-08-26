// GST Verification Routes
const express = require('express');
const router = express.Router();
const { verifyAndAutoFillGST, validateGSTIN, determineTaxType } = require('../utils/gstVerification');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const company = require('../config/company');

/**
 * @desc    Verify GSTIN and get auto-fill data
 * @route   GET /api/gst/verify/:gstin
 * @access  Public
 */
const verifyGSTIN = async (req, res) => {
    try {
        const { gstin } = req.params;

        console.log('[GST API] Verification request for GSTIN:', gstin);

        if (!gstin) {
            return res.status(400).json({
                success: false,
                error: 'GSTIN is required'
            });
        }

        // Perform GST verification and auto-fill
        const result = await verifyAndAutoFillGST(gstin);

        if (!result.success) {
            return res.status(400).json({
                verified: false,
                error: result.error
            });
        }

        // Format response to match frontend expectations
        const response = {
            verified: true,
            companyDetails: {
                gstin: result.gstin,
                legalName: result.autoFillFields.firmName,
                tradeName: result.autoFillFields.tradeName,
                principalPlaceOfBusiness: result.autoFillFields.firmAddress,
                state: result.autoFillFields.state, // Already formatted as "XX-StateName"
                stateCode: result.autoFillFields.stateCode,
                registrationDate: result.companyDetails?.registrationDate || new Date().toISOString().split('T')[0],
                status: 'Active'
            },
            taxType: result.taxInfo?.type || result.taxInfo
        };

        console.log('[GST API] Sending response to frontend:', JSON.stringify(response, null, 2));
        console.log('[GST API] Verification successful for:', response.companyDetails.legalName);
        res.json(response);

    } catch (error) {
        console.error('[GST API] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during GST verification'
        });
    }
};

/**
 * @desc    Quick GSTIN format validation
 * @route   GET /api/gst/validate/:gstin
 * @access  Public
 */
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
        res.status(500).json({
            valid: false,
            error: 'Validation service error'
        });
    }
};

/**
 * @desc    Get tax type based on state codes
 * @route   GET /api/gst/tax-type
 * @access  Public
 */
const getTaxType = async (req, res) => {
    try {
        const { companyStateCode, customerStateCode } = req.query;

        if (!companyStateCode || !customerStateCode) {
            return res.status(400).json({
                error: 'Both companyStateCode and customerStateCode are required'
            });
        }

        const taxType = companyStateCode === customerStateCode ? 'CGST_SGST' : 'IGST';

        res.json({
            taxType,
            companyStateCode,
            customerStateCode,
            isInterState: taxType === 'IGST'
        });

    } catch (error) {
        console.error('[GST API] Tax type error:', error);
        res.status(500).json({
            error: 'Tax type determination error'
        });
    }
};

// Utilities to compute period
const parsePeriod = (req) => {
  const { from, to } = req.query;
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to) : new Date();
  return { start, end };
};

const asCsv = (rows) => rows.map(r => r.map(v => (v==null?'':String(v).replace(/"/g,'""'))).map(v => `"${v}"`).join(',')).join('\n');

const getStateCode = (s) => {
  if (!s) return '';
  const m = String(s).match(/^(\d{2})/);
  return m ? m[1] : '';
}

const getFp = (d) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${y}${m}`;
}

// Build GST portal-like GSTR-1 JSON
async function buildGstr1(start, end) {
  const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).populate('customer').populate('items.item');
  const compCode = getStateCode(company.state);

  const b2bMap = new Map(); // ctin -> { ctin, inv: [] }
  const b2clMap = new Map(); // pos -> { pos, inv: [] }
  const b2csAgg = new Map(); // key: pos|rt|sply_ty -> row
  const exp = []; // export invoices

  let gt = 0, cur_gt = 0; // placeholders

  for (const inv of invoices) {
    const cust = inv.customer || {};
    const pos = getStateCode(cust.state);
    const inter = pos && compCode && pos !== compCode;
    const taxable = Number(inv.subTotal || 0);
    const igst = Number(inv.igst || 0);
    const cgst = Number(inv.cgst || 0);
    const sgst = Number(inv.sgst || 0);
    const total = Number(inv.grandTotal || inv.totalAmount || taxable + igst + cgst + sgst);
    cur_gt += total;

    // Items mapped to GST portal item schema
    const itms = (inv.items || []).map((li, idx) => {
      const qty = Number(li.quantity || 0);
      const rate = Number(li.rate || 0);
      const txval = qty * rate;
      const rt = Number(li.taxSlab || li.item?.taxSlab || 0);
      const taxAmt = txval * rt / 100;
      const split = inter ? { iamt: taxAmt, camt: 0, samt: 0 } : { iamt: 0, camt: taxAmt / 2, samt: taxAmt / 2 };
      return {
        num: idx + 1,
        itm_det: {
          hsn_sc: li.hsnCode || li.item?.hsnCode || '',
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
      pos: pos || compCode || '',
      rchrg: 'N',
      inv_typ: 'R',
      itms
    };

    // Exports / SEZ (exp section)
    if (inv.exportInfo && inv.exportInfo.isExport) {
      const exp_typ = (inv.exportInfo.exportType || '').toUpperCase() === 'SEZ' ? 'SEZ' : 'WPAY';
      const sply_ty = inv.exportInfo.withTax ? 'WPAY' : 'WOPAY';
      exp.push({
        exp_typ, // SEZ/EXP as per schema; using SEZ and generic WPAY for overseas
        inv: [{
          inum: invRow.inum,
          idt: invRow.idt,
          val: invRow.val,
          sbpcode: inv.exportInfo.portCode || '',
          sbnum: inv.exportInfo.shippingBillNo || '',
          sbdt: inv.exportInfo.shippingBillDate ? new Date(inv.exportInfo.shippingBillDate).toISOString().slice(0,10) : '',
          sply_ty: sply_ty,
          itms: itms
        }]
      });
      continue; // skip normal B2B/B2C classification if export
    }

    if (cust.customerType === 'B2B' && cust.gstNo) {
      const ctin = cust.gstNo;
      if (!b2bMap.has(ctin)) b2bMap.set(ctin, { ctin, inv: [] });
      b2bMap.get(ctin).inv.push(invRow);
    } else {
      // B2C split into B2CL (>2.5L inter-state) or B2CS (aggregated)
      if (inter && total > 250000) {
        const key = pos || '00';
        if (!b2clMap.has(key)) b2clMap.set(key, { pos: key, inv: [] });
        b2clMap.get(key).inv.push(invRow);
      } else {
        // Aggregate by POS, rate, supply type
        for (const it of itms) {
          const k = `${pos||'00'}|${it.itm_det.rt}|${inter ? 'INTER' : 'INTRA'}`;
          if (!b2csAgg.has(k)) b2csAgg.set(k, {
            sply_ty: inter ? 'INTER' : 'INTRA',
            typ: 'OE',
            pos: pos || compCode || '00',
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
      }
    }
  }

  const b2b = Array.from(b2bMap.values());
  const b2cl = Array.from(b2clMap.values());
  const b2cs = Array.from(b2csAgg.values());

  // Placeholders for sections not tracked yet
  const cdnr = []; // Credit/Debit Notes to registered
  const cdnur = []; // Credit/Debit Notes to unregistered

  const today = new Date();
  const payload = {
    gstin: company.gstin || '',
    fp: getFp(start),
    version: 'GST3.0',
    gt: +gt.toFixed(2),
    cur_gt: +cur_gt.toFixed(2),
    b2b, b2cl, b2cs, cdnr, cdnur, exp
  };

  return payload;
}

// GSTR-1: GST portal schema JSON (default) or CSV fallback
router.get('/returns/gstr1', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);

    // CSV fallback for simple export (legacy)
    if ((req.query.format || '').toLowerCase() === 'csv') {
        const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).populate('customer').populate('items.item');
        const compCode = getStateCode(company.state || '');

        const rows = invoices.map(inv => {
          const cust = inv.customer || {};
          // compute totals from items when invoice-level fields are missing or zero
          let taxable = 0, igst = 0, cgst = 0, sgst = 0;
          const pos = getStateCode(cust.state);
          const inter = pos && compCode && pos !== compCode;
          for (const li of (inv.items || [])) {
            const qty = Number(li.quantity || 0);
            const rate = Number(li.rate || li.item?.rate || li.item?.sellingPrice || 0);
            const taxRate = Number(li.taxSlab || li.item?.taxSlab || 0);
            // discount amount if stored as absolute
            const discountAmt = Number(li.discountAmount || 0);
            // if discount stored as percent on line
            const discountPct = Number(li.discount || 0);
            const gross = qty * rate;
            const discount = discountAmt || (gross * (discountPct || 0) / 100);
            const txval = Math.max(0, gross - discount);
            const taxAmt = txval * taxRate / 100;
            taxable += txval;
            if (inter) igst += taxAmt; else { cgst += taxAmt / 2; sgst += taxAmt / 2; }
          }
          // fallback to stored values if present (use stored when > 0)
          taxable = Number(inv.subTotal) > 0 ? Number(inv.subTotal) : taxable;
          igst = Number(inv.igst) > 0 ? Number(inv.igst) : igst;
          cgst = Number(inv.cgst) > 0 ? Number(inv.cgst) : cgst;
          sgst = Number(inv.sgst) > 0 ? Number(inv.sgst) : sgst;
          const total = Number(inv.grandTotal || inv.totalAmount || taxable + igst + cgst + sgst);
          return [
            inv.invoiceNumber,
            inv.invoiceDate?.toISOString().slice(0,10),
            cust.firmName || cust.name || '',
            cust.gstNo || '',
            cust.state || '',
            +taxable.toFixed(2),
            +igst.toFixed(2), +cgst.toFixed(2), +sgst.toFixed(2), +total.toFixed(2)
          ];
        });
      const header = ['Invoice Number','Invoice Date','Customer Name','GSTIN','Place of Supply','Taxable Value','IGST','CGST','SGST','Total'];
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition',`attachment; filename=gstr1-${start.toISOString().slice(0,10)}-${end.toISOString().slice(0,10)}.csv`);
      return res.send(asCsv([header, ...rows]));
    }

    // Default: portal schema JSON
    const payload = await buildGstr1(start, end);
    res.json(payload);
  } catch (error) {
    console.error('[GST] GSTR-1 error', error);
    res.status(500).json({ error: 'Failed to compute GSTR-1' });
  }
});

// GSTR-3B summary
router.get('/returns/gstr3b', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).populate('items.item').populate('customer');
    const compCode = getStateCode(company.state || '');
    let taxable = 0, igst = 0, cgst = 0, sgst = 0;
    for (const inv of invoices) {
      // compute per-invoice totals from items if stored fields missing
      let invTaxable = 0, invIgst = 0, invCgst = 0, invSgst = 0;
      const pos = getStateCode((inv.customer && inv.customer.state) || '');
      const inter = pos && compCode && pos !== compCode;
      for (const li of (inv.items || [])) {
        const qty = Number(li.quantity || 0);
        const rate = Number(li.rate || li.item?.rate || li.item?.sellingPrice || 0);
        const taxRate = Number(li.taxSlab || li.item?.taxSlab || 0);
        const discountAmt = Number(li.discountAmount || 0);
        const discountPct = Number(li.discount || 0);
        const gross = qty * rate;
        const discount = discountAmt || (gross * (discountPct || 0) / 100);
        const txval = Math.max(0, gross - discount);
        const taxAmt = txval * taxRate / 100;
        invTaxable += txval;
        if (inter) invIgst += taxAmt; else { invCgst += taxAmt / 2; invSgst += taxAmt / 2; }
      }
      // use stored if available
      taxable += Number(inv.subTotal) > 0 ? Number(inv.subTotal) : invTaxable;
      igst += Number(inv.igst) > 0 ? Number(inv.igst) : invIgst;
      cgst += Number(inv.cgst) > 0 ? Number(inv.cgst) : invCgst;
      sgst += Number(inv.sgst) > 0 ? Number(inv.sgst) : invSgst;
    }

    const row = { outwardTaxableSupplies: +taxable.toFixed(2), igst: +igst.toFixed(2), cgst: +cgst.toFixed(2), sgst: +sgst.toFixed(2), exemptNil: 0 };

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const header = ['Outward Taxable Supplies','IGST','CGST','SGST','Exempt/Nil'];
      const data = [[row.outwardTaxableSupplies,row.igst,row.cgst,row.sgst,row.exemptNil]];
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition',`attachment; filename=gstr3b-${start.toISOString().slice(0,10)}-${end.toISOString().slice(0,10)}.csv`);
      return res.send(asCsv([header, ...data]));
    }

    res.json({ period: { from: start, to: end }, summary: row });
  } catch (error) {
    console.error('[GST] GSTR-3B error', error);
    res.status(500).json({ error: 'Failed to compute GSTR-3B' });
  }
});

// HSN summary
router.get('/returns/hsn-summary', async (req, res) => {
  try {
    const { start, end } = parsePeriod(req);
    const invoices = await Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).populate('items.item');

    const map = new Map();
    for (const inv of invoices) {
      for (const li of inv.items || []) {
        const hsn = li.hsnCode || li.item?.hsnCode || 'NA';
        const name = li.item?.name || li.name || '';
        const qty = Number(li.quantity || 0);
        const rate = Number(li.rate || 0);
        const taxable = qty * rate;
        const taxRate = Number(li.taxSlab || li.item?.taxSlab || 0);
        const taxAmt = taxable * taxRate / 100;
        if (!map.has(hsn)) map.set(hsn, { hsn, description: name, quantity: 0, taxableValue: 0, taxAmount: 0, taxRate });
        const row = map.get(hsn);
        row.quantity += qty; row.taxableValue += taxable; row.taxAmount += taxAmt; row.taxRate = taxRate || row.taxRate;
      }
    }
    const rows = Array.from(map.values());

    if ((req.query.format || '').toLowerCase() === 'csv') {
      const header = ['HSN','Description','Quantity','Tax Rate %','Taxable Value','Tax Amount'];
      const data = rows.map(r => [r.hsn,r.description,r.quantity,r.taxRate,r.taxableValue,r.taxAmount]);
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition',`attachment; filename=hsn-summary-${start.toISOString().slice(0,10)}-${end.toISOString().slice(0,10)}.csv`);
      return res.send(asCsv([header, ...data]));
    }

    res.json({ period: { from: start, to: end }, count: rows.length, rows });
  } catch (error) {
    console.error('[GST] HSN summary error', error);
    res.status(500).json({ error: 'Failed to compute HSN summary' });
  }
});

// Define routes
router.get('/verify/:gstin', verifyGSTIN);
router.get('/validate/:gstin', quickValidateGSTIN);
router.get('/tax-type', getTaxType);

module.exports = router;
