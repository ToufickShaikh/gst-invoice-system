// Unified GST Reporting Service
const Invoice = require('../models/Invoice');
const company = require('../config/company');
const { calculateItemTaxes } = require('../utils/taxHelpers');

// Main function to generate all GST reports for a given period
async function generateGstReports({ from, to }) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    console.log(`[gstService] Generating reports for period: ${start.toISOString()} to ${end.toISOString()}`);

    const invoices = await Invoice.find({
        invoiceDate: { $gte: start, $lte: end },
        status: { $ne: 'CANCELLED' }
    })
    .populate('customer', 'firmName gstin state')
    .populate('items.item', 'name hsnCode taxSlab')
    .lean();

    console.log(`[gstService] Found ${invoices.length} non-cancelled invoices.`);

    const gstr1Data = generateGstr1(invoices, start);
    const gstr3bData = generateGstr3b(invoices);
    const docSummaryData = generateDocSummary(invoices, start, end);
    const hsnSummaryData = generateHsnSummary(invoices);

    return {
        gstr1: gstr1Data,
        gstr3b: gstr3bData,
        docSummary: docSummaryData,
        hsnSummary: hsnSummaryData,
        period: { from: start, to: end }
    };
}

// --- GSTR-1 Generation ---
function generateGstr1(invoices, startDate) {
    const b2b = [];
    const b2cl = [];
    const b2cs = [];
    let totalValue = 0;

    invoices.forEach(inv => {
        const isB2B = !!inv.customer?.gstin;
        const amount = Number(inv.grandTotal || 0);
        totalValue += amount;
        const isLarge = amount > 250000;

        const invoicePayload = {
            inum: inv.invoiceNumber,
            idt: inv.invoiceDate.toISOString().split('T')[0],
            val: amount,
            pos: (inv.customer?.state || company.state || '27-Maharashtra').substring(0, 2),
            rchrg: inv.reverseCharge ? 'Y' : 'N',
            inv_typ: inv.invoiceType === 'EXPORT' ? 'EXPWP' : 'R',
            itms: (inv.items || []).map(item => {
                const { igst, cgst, sgst, taxableValue } = calculateItemTaxes(item, inv.customer?.state);
                return {
                    num: 1,
                    itm_det: {
                        txval: taxableValue,
                        iamt: igst,
                        camt: cgst,
                        samt: sgst,
                        rt: item.taxSlab || item.item?.taxSlab || 0
                    }
                };
            })
        };

        if (isB2B) {
            let party = b2b.find(p => p.ctin === inv.customer.gstin);
            if (!party) {
                party = { ctin: inv.customer.gstin, inv: [] };
                b2b.push(party);
            }
            party.inv.push(invoicePayload);
        } else if (isLarge) {
            let state = b2cl.find(p => p.pos === invoicePayload.pos);
            if (!state) {
                state = { pos: invoicePayload.pos, inv: [] };
                b2cl.push(state);
            }
            state.inv.push(invoicePayload);
        } else {
            (inv.items || []).forEach(item => {
                const { igst, cgst, sgst, taxableValue } = calculateItemTaxes(item, inv.customer?.state);
                const rt = item.taxSlab || item.item?.taxSlab || 0;
                const pos = invoicePayload.pos;

                let entry = b2cs.find(e => e.pos === pos && e.rt === rt);
                if (!entry) {
                    entry = { sply_ty: 'INTRA', pos, rt, txval: 0, iamt: 0, camt: 0, samt: 0 };
                    b2cs.push(entry);
                }
                entry.txval += taxableValue;
                entry.iamt += igst;
                entry.camt += cgst;
                entry.samt += sgst;
            });
        }
    });

    const summary = {
        totalInvoices: invoices.length,
        counts: {
            b2b: b2b.reduce((acc, curr) => acc + curr.inv.length, 0),
            b2cl: b2cl.reduce((acc, curr) => acc + curr.inv.length, 0),
            b2cs: b2cs.length // This is a count of rate-wise summaries, not invoices
        },
        totals: {
            taxableValue: invoices.reduce((acc, inv) => acc + (inv.subTotal || 0), 0),
            igst: invoices.reduce((acc, inv) => acc + (inv.igst || 0), 0),
            cgst: invoices.reduce((acc, inv) => acc + (inv.cgst || 0), 0),
            sgst: invoices.reduce((acc, inv) => acc + (inv.sgst || 0), 0)
        }
    };

    return {
        gstr1: {
            gstin: company.gstin,
            ret_period: `${startDate.getFullYear()}${(startDate.getMonth() + 1).toString().padStart(2, '0')}`,
            gt: totalValue,
            cur_gt: totalValue,
            b2b,
            b2cl,
            b2cs
        },
        summary
    };
}

// --- GSTR-3B Generation ---
function generateGstr3b(invoices) {
    let taxable = 0, igst = 0, cgst = 0, sgst = 0;

    invoices.forEach(inv => {
        taxable += inv.subTotal || 0;
        igst += inv.igst || 0;
        cgst += inv.cgst || 0;
        sgst += inv.sgst || 0;
    });

    return {
        summary: {
            outwardTaxableSupplies: +taxable.toFixed(2),
            igst: +igst.toFixed(2),
            cgst: +cgst.toFixed(2),
            sgst: +sgst.toFixed(2),
            exemptNil: 0
        }
    };
}

// --- Document Summary Generation ---
function generateDocSummary(invoices, start, end) {
    const documents = invoices.map(inv => ({
        date: inv.invoiceDate,
        number: inv.invoiceNumber,
        type: inv.customer?.gstin ? 'B2B' : 'B2C',
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

    const summary = documents.reduce((acc, doc) => ({
        totalInvoices: acc.totalInvoices + 1,
        totalTaxableValue: acc.totalTaxableValue + doc.taxableValue,
        totalIgst: acc.totalIgst + doc.igst,
        totalCgst: acc.totalCgst + doc.cgst,
        totalSgst: acc.totalSgst + doc.sgst,
        totalAmount: acc.totalAmount + doc.total
    }), { totalInvoices: 0, totalTaxableValue: 0, totalIgst: 0, totalCgst: 0, totalSgst: 0, totalAmount: 0 });

    return {
        documents,
        summary,
        totalCount: documents.length
    };
}

// --- HSN Summary Generation ---
function generateHsnSummary(invoices) {
    const hsnMap = new Map();
    invoices.forEach(inv => {
        (inv.items || []).forEach(li => {
            const { igst, cgst, sgst, taxableValue } = calculateItemTaxes(li, inv.customer?.state);

            const hsn = li.hsnCode || li.item?.hsnCode || 'NA';
            const name = li.item?.name || li.name || '';
            const qty = Number(li.quantity || 0);
            const taxRate = Number(li.taxSlab || li.item?.taxSlab || 0);

            if (!hsnMap.has(hsn)) {
                hsnMap.set(hsn, { 
                    hsn, 
                    description: name, 
                    quantity: 0, 
                    taxableValue: 0, 
                    igst: 0, 
                    cgst: 0, 
                    sgst: 0, 
                    taxRate 
                });
            }

            const row = hsnMap.get(hsn);
            row.quantity += qty;
            row.taxableValue += taxableValue;
            row.igst += igst;
            row.cgst += cgst;
            row.sgst += sgst;
            row.taxRate = Math.max(row.taxRate, taxRate);
        });
    });

    const rows = Array.from(hsnMap.values()).map(row => ({
        ...row,
        quantity: +row.quantity.toFixed(2),
        taxableValue: +row.taxableValue.toFixed(2),
        igst: +row.igst.toFixed(2),
        cgst: +row.cgst.toFixed(2),
        sgst: +row.sgst.toFixed(2),
        taxRate: +row.taxRate.toFixed(2)
    }));

    return {
        count: rows.length,
        rows
    };
}

module.exports = { generateGstReports };