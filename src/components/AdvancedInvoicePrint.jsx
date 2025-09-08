import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/dateHelpers';
import { useCompany } from '../context/CompanyContext.jsx';
import { billingAPI } from '../api/billing';
import { invoicesAPI } from '../api/invoices';
import axiosInstance from '../api/axiosInstance';
import { getApiBaseUrl, getAppBasePath } from '../utils/appBase';
import { portalAPI } from '../api/portal';

const AdvancedInvoicePrint = ({ invoice, onClose, isVisible = false }) => {
  console.log('AdvancedInvoicePrint: invoice prop received:', invoice);
  const { company } = useCompany();
  const [printFormat, setPrintFormat] = useState('A4'); // A4, A5, Thermal
  const [iframeSrc, setIframeSrc] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    showGST: true,
    showHSN: true,
    showDiscount: true,
    showShipping: true
  });
  const [paymentQr, setPaymentQr] = useState('');

  useEffect(() => {
    let active = true;
    async function loadQr() {
      try {
        if (!isVisible || !invoice?._id) return;
        if (company?.upi?.qrImageUrl) {
          setPaymentQr(company.upi.qrImageUrl);
          return;
        }
        const res = await billingAPI.generatePaymentQr(invoice._id);
        if (!active) return;
        if (res?.qrCodeImage) setPaymentQr(res.qrCodeImage);
      } catch (e) {
        console.warn('Payment QR generation failed:', e?.message || e);
      }
    }

    loadQr();
    return () => { active = false; };
  }, [isVisible, invoice?._id, company?.upi?.qrImageUrl]);

  // When Thermal format is selected, create portal link and load public thermal preview
  useEffect(() => {
    let mounted = true;
    async function loadThermalPreview() {
      if (printFormat !== 'Thermal' || !invoice?._id) {
        setIframeSrc(null);
        setLoadingPreview(false);
        return;
      }
      try {
        setLoadingPreview(true);
        // Create a portal link (protected API expects auth; axiosInstance handles headers)
        const res = await portalAPI.createInvoicePortalLink(invoice._id);
        const url = res?.url;

        // Compute api base once (prefer axiosInstance baseURL if set)
        const apiBase = (axiosInstance && axiosInstance.defaults && axiosInstance.defaults.baseURL)
          ? axiosInstance.defaults.baseURL.replace(/\/$/, '')
          : (getApiBaseUrl() || getAppBasePath() || '');

        if (url) {
          if (url.includes('/portal/invoice/')) {
            const tail = url.split('/portal/invoice/')[1] || '';
            const parts = tail.split('/').filter(Boolean);
            const pid = parts[0] || invoice._id;
            const ptoken = parts[1] || null;
            const previewUrl = `${apiBase}/billing/public/print/thermal/${pid}` + (ptoken ? `?token=${ptoken}` : '');
            if (mounted) setIframeSrc(previewUrl);
          } else {
            const previewUrl = `${apiBase}/billing/public/print/thermal/${invoice._id}`;
            if (mounted) setIframeSrc(previewUrl);
          }
        } else {
          // Fallback: call thermal endpoint directly
          if (mounted) setIframeSrc(`${apiBase}/billing/public/print/thermal/${invoice._id}`);
        }
      } catch (e) {
        console.error('Failed to load thermal preview:', e);
        setIframeSrc(null);
        toast.error(e?.response?.data?.message || 'Failed to load thermal preview');
      } finally {
        if (mounted) setLoadingPreview(false);
      }
    }
    loadThermalPreview();
    return () => { mounted = false; };
  }, [printFormat, invoice?._id]);

  const safeDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt;
  };

  const normalize = (inv) => {
    console.log('normalize: inv received:', inv);
    if (!inv) return {};
    const date = safeDate(inv.invoiceDate || inv.date || inv.createdAt);
    const dueDate = safeDate(inv.dueDate || (date ? new Date(new Date(date).getTime() + 30 * 86400000) : null));

    const items = (inv.items || []).map((it, idx) => {
      const src = it.item && typeof it.item === 'object' ? it.item : it;
      const name = it.name || src?.name || `Item ${idx + 1}`;
      const hsnCode = it.hsnCode || src?.hsnCode || '';
      const quantity = Number(it.quantity || 0) || 1;
      const rate = Number(it.rate ?? src?.rate ?? src?.price ?? src?.sellingPrice ?? 0) || 0;
      const taxRate = Number(it.taxSlab ?? it.taxRate ?? src?.taxSlab ?? 0) || 0;
      const discountPct = Number(it.discount || 0) || 0;
      const priceType = (it.priceType || src?.priceType || 'Exclusive');

      // Handle Inclusive pricing: derive taxable unit price from inclusive rate
      let unitTaxable;
      if ((priceType || 'Exclusive') === 'Inclusive' && taxRate) {
        unitTaxable = rate / (1 + taxRate / 100);
      } else {
        unitTaxable = rate;
      }

      // Apply discount on the taxable unit price, then multiply by quantity
      const discountedUnit = unitTaxable * (1 - (discountPct || 0) / 100);
      const taxable = discountedUnit * quantity;
      const tax = (taxable * taxRate) / 100;

      // For Inclusive pricing the visible line amount equals rate * quantity * (1 - discount)
      const lineTotal = (priceType === 'Inclusive')
        ? rate * quantity * (1 - (discountPct || 0) / 100)
        : taxable + tax;

      return { name, hsnCode, quantity, rate, taxRate, discount: discountPct, priceType, amount: lineTotal, taxable, tax };
    });

    const subTotal = inv.subTotal ?? inv.subtotal ?? items.reduce((s, it) => s + it.taxable, 0);
    const totalTax = inv.totalTax ?? items.reduce((s, it) => s + it.tax, 0);
    const shippingCharges = Number(inv.shippingCharges || 0);
    const total = inv.grandTotal ?? inv.totalAmount ?? inv.total ?? (subTotal + totalTax + shippingCharges);

    const paidAmount = Number(inv.paidAmount || 0);
    const customer = {
      name: inv.customer?.firmName || inv.customer?.name || 'Customer Name',
      phone: inv.customer?.contact || inv.customer?.phone || '',
      address: inv.customer?.firmAddress || inv.customer?.billingAddress || inv.customer?.address || 'Customer Address',
    };

    return { date, dueDate, items, subTotal, totalTax, shippingCharges, total, paidAmount, customer };
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStateCode = (stateStr) => {
    if (!stateStr) return '';
    const parts = String(stateStr).split('-');
    return (parts[0] || '').trim();
  };

  const buildTaxSummary = (norm) => {
    const compStateCode = getStateCode(company?.state);
    const custStateCode = getStateCode(invoice?.customer?.state);
    const isInterState = compStateCode && custStateCode && compStateCode !== custStateCode;

    const map = {};
    (norm.items || []).forEach((it) => {
      const hsn = it.hsnCode || 'NA';
      if (!map[hsn]) {
        map[hsn] = isInterState
          ? { hsnCode: hsn, taxableAmount: 0, igstRate: it.taxRate, igstAmount: 0, totalTax: 0, isInterState }
          : { hsnCode: hsn, taxableAmount: 0, cgstRate: it.taxRate / 2, sgstRate: it.taxRate / 2, cgstAmount: 0, sgstAmount: 0, totalTax: 0, isInterState };
      }
      map[hsn].taxableAmount += it.taxable || 0;
      map[hsn].totalTax += it.tax || 0;
      if (isInterState) {
        map[hsn].igstAmount += it.tax || 0;
      } else {
        map[hsn].cgstAmount += (it.tax || 0) / 2;
        map[hsn].sgstAmount += (it.tax || 0) / 2;
      }
    });

    const rows = Object.values(map);
    const totals = rows.reduce((acc, r) => {
      acc.taxableAmount += r.taxableAmount || 0;
      acc.totalTax += r.totalTax || 0;
      acc.igstAmount += r.igstAmount || 0;
      acc.cgstAmount += r.cgstAmount || 0;
      acc.sgstAmount += r.sgstAmount || 0;
      return acc;
    }, { taxableAmount: 0, igstAmount: 0, cgstAmount: 0, sgstAmount: 0, totalTax: 0 });

    return { rows, totals };
  };

  const buildPreviewHtml = (format = 'A4') => {
    console.log('buildPreviewHtml: invoice received:', invoice);
    if (!invoice) return '';
    const norm = normalize(invoice);
    console.log('buildPreviewHtml: normalized data (norm):', norm);
    const { rows, totals } = buildTaxSummary(norm);

    const itemsHead = ['Item', ...(printOptions.showHSN ? ['HSN'] : []), 'Qty', 'Rate', ...(printOptions.showDiscount ? ['Disc%'] : []), ...(printOptions.showGST ? ['Tax%'] : []), 'Amount'];
    const itemsRows = (norm.items || []).map(it => `<tr>
      <td>${it.name}</td>
      ${printOptions.showHSN ? `<td>${it.hsnCode || ''}</td>` : ''}
      <td>${it.quantity}</td>
      <td class="right">${formatCurrency(it.rate)}</td>
      ${printOptions.showDiscount ? `<td>${it.discount}%</td>` : ''}
      ${printOptions.showGST ? `<td>${it.taxRate}%</td>` : ''}
      <td class="right">${formatCurrency(it.amount)}</td>
    </tr>`).join('');

    // New: compute footer details (bank, QR, signature, terms)
    const balanceDue = Math.max(0, Number(norm.total || 0) - Number(norm.paidAmount || 0));
    const bank = company?.bank || {};
    const hasBank = !!(bank.name || bank.account || bank.ifsc || bank.holder);
    const signatureUrl = company?.signatureImageUrl || '';
    const hasSignature = !!(signatureUrl || company?.name);
    const showFooter = hasBank || hasSignature || (paymentQr && balanceDue > 0);
    const termsHtml = company?.terms
      ? (Array.isArray(company.terms)
          ? `<ul style="margin:2mm 0 0 5mm;">${company.terms.map(t => `<li>${t}</li>`).join('')}</ul>`
          : `<div>${company.terms}</div>`)
      : '';

    const pageSize = (format || 'A4').toUpperCase() === 'A5' ? 'A5' : 'A4';

    return `<!DOCTYPE html>
    <html><head><meta charset="utf-8" />
    <style>
      @page { size: ${pageSize}; margin: 10mm; }
      body { font-family: Arial, sans-serif; color:#000; }
      .container { width: 190mm; margin: 0 auto; }
      h1 { font-size: 18px; margin: 4mm 0; text-align:center; }
      .center { text-align:center; }
      table { width:100%; border-collapse: collapse; }
      th, td { border:1px solid #000; font-size: 11px; padding: 4px 6px; }
      th { background:#f5f5f5; }
      .right{ text-align:right; }
      .grid { display:flex; gap:10mm; }
      .col { flex:1; }
      .box { border:1px solid #000; padding:4mm; }
      .amount-row { display:flex; justify-content:space-between; padding:2px 0; }
      .amount-row.total { border-top:1px solid #000; font-weight:bold; margin-top:2mm; padding-top:2mm; }
    </style></head>
    <body><div class="container">
      <div class="center">
        <div style="font-size:18px;font-weight:bold;">${company?.name || 'Company Name'}</div>
        <div style="font-size:11px;">${company?.address || ''}</div>
        <div style="font-size:11px;">${company?.phone || ''}${company?.email ? ' | ' + company.email : ''}${company?.gstin ? ' | GSTIN: ' + company.gstin : ''}</div>
      </div>
      <h1>TAX INVOICE</h1>
      <div class="grid">
        <div class="col box">
          <div><b>Invoice No:</b> ${invoice.invoiceNumber || invoice.number || invoice._id}</div>
          <div><b>Date:</b> ${formatDate(norm.date)}</div>
          <div><b>Due Date:</b> ${formatDate(norm.dueDate)}</div>
        </div>
        <div class="col box">
          <div><b>Bill To</b></div>
          <div style="font-weight:bold;">${norm.customer.name}</div>
          <div>${norm.customer.phone || ''}</div>
          <div>${norm.customer.address || ''}</div>
        </div>
      </div>

      <div style="margin-top:6mm;">
        <table>
          <thead><tr>${itemsHead.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>

      <div class="grid" style="margin-top:6mm; align-items:flex-start;">
        <div class="col">
          <div class="box">
            <div style="font-weight:bold;margin-bottom:3mm;">TAX SUMMARY</div>
            <table>
              <thead>
                <tr><th>HSN</th><th>Taxable</th><th>IGST%</th><th>IGST</th><th>CGST%</th><th>CGST</th><th>SGST%</th><th>SGST</th><th>Total Tax</th></tr>
              </thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td>${r.hsnCode}</td>
                    <td class="right">${formatCurrency(r.taxableAmount)}</td>
                    <td class="right">${r.isInterState ? r.igstRate : '-'}</td>
                    <td class="right">${r.isInterState ? formatCurrency(r.igstAmount) : '-'}</td>
                    <td class="right">${!r.isInterState ? r.cgstRate : '-'}</td>
                    <td class="right">${!r.isInterState ? formatCurrency(r.cgstAmount) : '-'}</td>
                    <td class="right">${!r.isInterState ? formatCurrency(r.sgstRate) : '-'}</td>
                    <td class="right">${!r.isInterState ? formatCurrency(r.sgstAmount) : '-'}</td>
                    <td class="right">${formatCurrency(r.totalTax)}</td>
                  </tr>`).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td><b>Total</b></td>
                  <td class="right"><b>${formatCurrency(totals.taxableAmount)}</b></td>
                  <td></td>
                  <td class="right"><b>${formatCurrency(totals.igstAmount)}</b></td>
                  <td></td>
                  <td class="right"><b>${formatCurrency(totals.cgstAmount)}</b></td>
                  <td></td>
                  <td class="right"><b>${formatCurrency(totals.sgstAmount)}</b></td>
                  <td class="right"><b>${formatCurrency(totals.totalTax)}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div class="col">
          <div class="box">
            <div class="amount-row"><span>Sub Total:</span><span>${formatCurrency(norm.subTotal)}</span></div>
            <div class="amount-row"><span>Total Tax:</span><span>${formatCurrency(norm.totalTax)}</span></div>
            ${printOptions.showShipping ? `<div class="amount-row"><span>Shipping:</span><span>${formatCurrency(norm.shippingCharges || 0)}</span></div>` : ''}
            <div class="amount-row total"><span>Grand Total:</span><span>${formatCurrency(norm.total)}</span></div>
            <div class="amount-row"><span>Received:</span><span>${formatCurrency(norm.paidAmount || 0)}</span></div>
            <div class="amount-row"><span>Balance:</span><span>${formatCurrency(balanceDue)}</span></div>
          </div>
        </div>
      </div>

      ${showFooter ? `
      <div class="grid" style="margin-top:6mm; align-items:flex-start;">
        <div class="col">
          <div class="box">
            <div style="font-weight:bold;margin-bottom:3mm;">Bank Details</div>
            ${hasBank ? `
            <div style="font-size:11px;">
              ${bank.name ? `<div><b>Bank Name:</b> ${bank.name}</div>` : ''}
              ${bank.account ? `<div><b>Account No:</b> ${bank.account}</div>` : ''}
              ${bank.ifsc ? `<div><b>IFSC Code:</b> ${bank.ifsc}</div>` : ''}
              ${bank.holder ? `<div><b>Account Holder:</b> ${bank.holder}</div>` : ''}
            </div>` : `<div style="font-size:11px;">No bank details configured.</div>`}
            ${(paymentQr && balanceDue > 0) ? `
              <div style="text-align:center; margin-top:4mm;">
                <div style="font-weight:bold; font-size:11px; margin-bottom:2mm;">Scan to Pay</div>
                <img src="${paymentQr}" alt="UPI QR" style="width:60px; height:60px; border:1px solid #000;"/>
                ${company?.upi?.id ? `<div style="font-size:10px; margin-top:2mm;">UPI: ${company.upi.id}</div>` : ''}
              </div>` : ''}
          </div>
        </div>
        <div class="col">
          <div class="box" style="text-align:center;">
            <div style="font-weight:bold;margin-bottom:3mm;">Authorized Signatory</div>
            <div style="margin-bottom:2mm;">For ${company?.name || ''}</div>
            ${signatureUrl ? `<img src="${signatureUrl}" alt="Signature" style="width:80px;height:30px;border:1px solid #000; margin-bottom:2mm;"/>` : '<div style="height:30px; border-bottom:1px solid #000; width:80px; margin: 0 auto 2mm;"></div>'}
            <div style="font-size:11px; font-weight:bold;">Authorized Signatory</div>
          </div>
        </div>
      </div>` : ''}

      ${termsHtml ? `<div style="margin-top:6mm;" class="box"><b>Terms:</b>${termsHtml}</div>` : ''}
    </div></body></html>`;
  };

  const handlePrint = async () => {
    try {
      // Prefer server-rendered PDF for consistent preview and print across deployments.
      const formatParam = printFormat === 'Thermal' ? 'thermal' : (printFormat === 'A5' ? 'a5' : 'a4');
      if (invoice?._id) {
        try {
          const pdfUrl = invoicesAPI.publicPdfUrl(invoice._id, null, formatParam);
          const w = window.open(pdfUrl, '_blank');
          if (!w) {
            toast.error('Pop-up blocked. Allow pop-ups to print.');
          }
          return;
        } catch (err) {
          console.warn('Server PDF preview failed, falling back to client-side preview', err);
          // fallthrough to client-side printing
        }
      }

      // Fallback: client-side HTML print (keeps previous behaviour)
      const html = buildPreviewHtml(printFormat === 'A5' ? 'A5' : 'A4');
      const win = window.open('', '_blank');
      if (!win) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }
      win.document.open();
      // Auto-print on load and close after print
      const autoPrintHtml = html.replace('</body>', '<script>window.onload=function(){window.print(); window.onafterprint = window.close;};<\/script></body>');
      win.document.write(autoPrintHtml);
      win.document.close();
    } catch (e) {
      console.error('Print error:', e);
      toast.error('Failed to open print window.');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 py-2 border-b flex items-center justify-between">
          <div className="font-semibold">Invoice Preview</div>
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1 text-sm" value={printFormat} onChange={(e)=>setPrintFormat(e.target.value)}>
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Thermal">Thermal (2.5in)</option>
            </select>
            <button onClick={handlePrint} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Print</button>
            <button onClick={onClose} className="px-3 py-1 border rounded text-sm">Close</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {printFormat === 'Thermal' ? (
            <div className="w-full h-[70vh]">
              {loadingPreview ? (
                <div className="p-4">Loading thermal preview...</div>
              ) : (
                <iframe title="invoice-thermal-preview" className="w-full h-[70vh]" src={iframeSrc || ''} />
              )}
            </div>
          ) : (
            <iframe title="invoice-preview" className="w-full h-[70vh]" srcDoc={buildPreviewHtml(printFormat === 'A5' ? 'A5' : 'A4')} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedInvoicePrint;
