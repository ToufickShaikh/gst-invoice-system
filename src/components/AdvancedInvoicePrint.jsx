import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '../utils/dateHelpers';
import { useCompany } from '../context/CompanyContext.jsx';
import { billingAPI } from '../api/billing';

const AdvancedInvoicePrint = ({ invoice, onClose, isVisible = false }) => {
  const { company } = useCompany();
  const [printFormat, setPrintFormat] = useState('A4'); // A4, A5, Thermal
  const [printCopies, setPrintCopies] = useState(1);
  const [includeQR, setIncludeQR] = useState(true);
  const [includeTerms, setIncludeTerms] = useState(true);
  const [printOptions, setPrintOptions] = useState({
    showGST: true,
    showHSN: true,
    showDiscount: true,
    showShipping: true,
    watermark: false
  });
  const [paymentQr, setPaymentQr] = useState('');

  useEffect(() => {
    let active = true;
    async function loadQr() {
      try {
        if (!isVisible || !invoice?._id) return;
        // Use static QR if configured globally
        if (company?.upi?.qrImageUrl) {
          setPaymentQr(company.upi.qrImageUrl);
          return;
        }
        // Otherwise, generate dynamically (amount included if pending; none if paid)
        const res = await billingAPI.generatePaymentQr(invoice._id);
        if (!active) return;
        if (res?.qrCodeImage) setPaymentQr(res.qrCodeImage);
      } catch (e) {
        // Silent fail; footer will show placeholder
        console.warn('Payment QR generation failed:', e?.message || e);
      }
    }
    loadQr();
    return () => { active = false; };
  }, [isVisible, invoice?._id, company?.upi?.qrImageUrl]);

  const safeDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt;
  };

  const normalize = (inv) => {
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

      const taxable = rate * quantity * (1 - discountPct / 100);
      const tax = (taxable * taxRate) / 100;
      const lineTotal = taxable + tax;

      return { name, hsnCode, quantity, rate, taxRate, discount: discountPct, amount: lineTotal, taxable, tax };
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

  const generatePDF = () => {
    if (!invoice) {
      toast.error('No invoice data available');
      return;
    }
    const norm = normalize(invoice);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: printFormat === 'A4' ? 'a4' : printFormat === 'A5' ? 'a5' : [80, 200] });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Company Header (from backend/config/company.js via /api/company)
      const comp = company || {};
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(comp.name || 'Company Name', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(comp.address || '', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.text(`Phone: ${comp.phone || ''}${comp.email ? ' | Email: ' + comp.email : ''}`, pageWidth / 2, yPosition, { align: 'center' });
      if (printOptions.showGST && comp.gstin) {
        yPosition += 5;
        pdf.text(`GSTIN: ${comp.gstin}`, pageWidth / 2, yPosition, { align: 'center' });
      }

      // Invoice Title
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TAX INVOICE', pageWidth / 2, yPosition, { align: 'center' });

      // Invoice Details Box
      yPosition += 10;
      const detailsBoxHeight = 25;
      pdf.rect(10, yPosition, pageWidth - 20, detailsBoxHeight);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Invoice No: ${invoice.invoiceNumber}`, 15, yPosition + 6);
      pdf.text(`Date: ${formatDate(norm.date)}`, 15, yPosition + 12);
      pdf.text(`Due Date: ${formatDate(norm.dueDate)}`, 15, yPosition + 18);

      // Right side - Customer details
      const rightX = pageWidth / 2 + 10;
      pdf.text('Bill To:', rightX, yPosition + 6);
      pdf.setFont('helvetica', 'bold');
      pdf.text(norm.customer.name, rightX, yPosition + 12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(norm.customer.phone || '', rightX, yPosition + 18);

      // Customer Address Box
      yPosition += detailsBoxHeight + 5;
      const addressBoxHeight = 20;
      pdf.rect(10, yPosition, pageWidth - 20, addressBoxHeight);
      pdf.text('Billing Address:', 15, yPosition + 6);
      const addressLines = pdf.splitTextToSize(norm.customer.address, pageWidth - 30);
      pdf.text(addressLines, 15, yPosition + 12);

      // Items Table
      yPosition += addressBoxHeight + 10;
      const tableColumns = [ 'Item', ...(printOptions.showHSN ? ['HSN'] : []), 'Qty', 'Rate', ...(printOptions.showDiscount ? ['Disc%'] : []), ...(printOptions.showGST ? ['Tax%'] : []), 'Amount' ];
      const tableData = norm.items.map((item) => [ item.name, ...(printOptions.showHSN ? [item.hsnCode] : []), item.quantity, formatCurrency(item.rate), ...(printOptions.showDiscount ? [`${item.discount}%`] : []), ...(printOptions.showGST ? [`${item.taxRate}%`] : []), formatCurrency(item.amount) ]);
      pdf.autoTable({ head: [tableColumns], body: tableData, startY: yPosition, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 'auto' }, [tableColumns.length - 1]: { halign: 'right' } } });

      // Totals
      const subtotal = norm.subTotal;
      const discountAmt = 0; // discount collapsed into taxable in normalize
      const shipping = norm.shippingCharges || 0;
      const taxAmount = norm.totalTax || 0;
      const total = norm.total;

      yPosition = pdf.lastAutoTable.finalY + 10;
      const totalsX = pageWidth - 60;
      pdf.setFontSize(9);
      pdf.text('Subtotal:', totalsX, yPosition); pdf.text(formatCurrency(subtotal), pageWidth - 15, yPosition, { align: 'right' });
      if (printOptions.showShipping && shipping > 0) { yPosition += 5; pdf.text('Shipping:', totalsX, yPosition); pdf.text(formatCurrency(shipping), pageWidth - 15, yPosition, { align: 'right' }); }
      if (printOptions.showGST && taxAmount > 0) { yPosition += 5; pdf.text('Tax Amount:', totalsX, yPosition); pdf.text(formatCurrency(taxAmount), pageWidth - 15, yPosition, { align: 'right' }); }
      yPosition += 8; pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text('Total:', totalsX, yPosition); pdf.text(formatCurrency(total), pageWidth - 15, yPosition, { align: 'right' });

      // Payment Info
      if (invoice.paymentMethod || norm.paidAmount) {
        yPosition += 10; pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
        pdf.text('Payment Details:', 15, yPosition); yPosition += 5;
        if (invoice.paymentMethod) pdf.text(`Method: ${invoice.paymentMethod}`, 15, yPosition);
        if (norm.paidAmount > 0) { yPosition += 5; pdf.text(`Paid: ${formatCurrency(norm.paidAmount)}`, 15, yPosition); pdf.text(`Balance: ${formatCurrency(total - norm.paidAmount)}`, 15, yPosition + 5); }
      }

      // QR Code placeholder
      if (includeQR) {
        yPosition += 15;
        pdf.rect(15, yPosition, 25, 25);
        pdf.setFontSize(8);
        pdf.text('QR Code', 17, yPosition + 13);
        pdf.text('Pay via UPI', pageWidth - 50, yPosition + 8);
        pdf.text(`UPI ID: ${comp.upi?.id || ''}`, pageWidth - 50, yPosition + 13);
      }

      // Terms and Conditions
      if (includeTerms) {
        yPosition += 35;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Terms & Conditions:', 15, yPosition);
        pdf.setFont('helvetica', 'normal');
        const terms = [
          '1. Payment is due within 30 days of invoice date.',
          '2. Late payments may incur additional charges.',
          '3. Goods once sold cannot be returned.',
          '4. Subject to local jurisdiction only.'
        ];
        terms.forEach((term, index) => {
          yPosition += 4;
          pdf.text(term, 15, yPosition);
        });
      }

      // Footer
      yPosition = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });

      // Watermark
      if (printOptions.watermark) {
        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(50);
        pdf.text('PAID', pageWidth / 2, pageHeight / 2, { 
          align: 'center',
          angle: 45
        });
        pdf.setTextColor(0, 0, 0);
      }

      // Save/Print PDF
      const fileName = `Invoice-${invoice.invoiceNumber}.pdf`;
      pdf.save(fileName);
      
      toast.success(`Invoice ${invoice.invoiceNumber} downloaded successfully!`);
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    generatePDF();
  };

  const previewInvoice = () => {
    // Generate preview in new window
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(generateHTMLPreview());
    previewWindow.document.close();
  };

  const generateHTMLPreview = () => {
    if (!invoice) return '';
    const norm = normalize(invoice);

    const comp = company || {};
    const companyName = comp.name || 'Company Name';
    const companyAddress = comp.address || '';
    const companyPhone = comp.phone || '';
    const companyEmail = comp.email || '';
    const companyGstin = comp.gstin || '';

    const companyStateCode = (comp.state || '').split('-')[0];
    const customerStateCode = (invoice.customer?.state || '').split('-')[0];

    const qrSrc = comp.upi?.qrImageUrl || paymentQr || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #000; }
          .container { max-width: 900px; margin: 0 auto; padding: 16px; }
          .header { border: 2px solid #000; margin-bottom: 12px; }
          .header-top { background: #f8f9fa; padding: 12px; text-align: center; border-bottom: 1px solid #000; }
          .brand { display:flex; align-items:center; justify-content:center; gap:12px; }
          .logo { height:48px; width:auto; object-fit:contain; }
          .company-name { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
          .meta { border: 1px solid #000; margin: 10px 0; }
          .meta-row { display: flex; border-bottom: 1px solid #000; }
          .meta-cell { flex: 1; padding: 8px 10px; border-right: 1px solid #000; }
          .meta-cell:last-child { border-right: none; }
          .party { display: flex; gap: 10px; margin: 10px 0; }
          .box { flex: 1; border: 1px solid #000; }
          .box .head { background:#f0f0f0; padding: 6px 10px; font-weight: bold; border-bottom: 1px solid #000; }
          .box .body { padding: 10px; }
          table { width:100%; border-collapse: collapse; }
          th, td { border:1px solid #000; font-size: 12px; padding: 6px 8px; }
          th { background:#f0f0f0; }
          .right { text-align: right; }
          .center { text-align: center; }
          .amounts { display:flex; gap: 10px; margin-top: 12px; }
          .amounts .left, .amounts .rightbox { flex:1; border:1px solid #000; }
          .row { display:flex; justify-content: space-between; padding: 6px 10px; }
          .row.total { border-top:1px solid #000; font-weight:bold; }
          .words { border:1px solid #000; padding: 10px; margin-top: 10px; background: #f8f9fa; }
          .no-print { text-align:center; margin-top: 16px; }
          .footer { display:flex; gap:12px; margin-top:14px; }
          .footer .box { flex:1; border:1px solid #000; padding:10px; }
          .small { font-size:12px; color:#333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-top">
              <div class="brand">
                ${comp.logoUrl ? `<img class="logo" src="${comp.logoUrl}" alt="Logo"/>` : ''}
                <div>
                  <div class="company-name">${companyName}</div>
                  <div>${companyAddress}<br/>Phone: ${companyPhone} ${companyEmail ? `| Email: ${companyEmail}` : ''}${companyGstin ? ` | GSTIN: ${companyGstin}` : ''}</div>
                </div>
              </div>
            </div>
            <div class="meta">
              <div class="meta-row">
                <div class="meta-cell"><div style="color:#666">Invoice No</div>${invoice.invoiceNumber || ''}</div>
                <div class="meta-cell"><div style="color:#666">Invoice Date</div>${formatDate(norm.date)}</div>
                <div class="meta-cell"><div style="color:#666">Due Date</div>${formatDate(norm.dueDate)}</div>
              </div>
              <div class="meta-row">
                <div class="meta-cell"><div style="color:#666">Payment Status</div>${invoice.paymentStatus || (norm.total - (norm.paidAmount||0) <= 0 ? 'Paid' : (norm.paidAmount ? 'Partial' : 'Pending'))}</div>
                <div class="meta-cell"><div style="color:#666">Place of Supply</div>${invoice.customer?.state || ''}</div>
                <div class="meta-cell"><div style="color:#666">Supply Type</div>${(customerStateCode && companyStateCode && customerStateCode !== companyStateCode) ? 'Interstate' : 'Intrastate'}</div>
              </div>
            </div>
          </div>

          <div class="party">
            <div class="box">
              <div class="head">BILL TO</div>
              <div class="body">
                <div><b>${norm.customer.name}</b></div>
                <div>${norm.customer.address}</div>
                <div>${norm.customer.phone || ''}</div>
              </div>
            </div>
            <div class="box">
              <div class="head">SHIP TO</div>
              <div class="body">
                <div><b>${norm.customer.name}</b></div>
                <div>${norm.customer.address}</div>
                <div>${norm.customer.phone || ''}</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:5%">#</th>
                <th style="width:30%">Item</th>
                <th style="width:10%">HSN</th>
                <th style="width:8%">Qty</th>
                <th style="width:10%">Unit</th>
                <th style="width:12%">Rate</th>
                <th style="width:10%">Tax%</th>
                <th style="width:15%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${norm.items.map((item, i) => `
                <tr>
                  <td class="center">${i+1}</td>
                  <td>${item.name}</td>
                  <td class="center">${item.hsnCode || ''}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="center">${invoice.items?.[i]?.units || 'pcs'}</td>
                  <td class="right">${formatCurrency(item.rate)}</td>
                  <td class="center">${item.taxRate}%</td>
                  <td class="right">${formatCurrency(item.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="right"><b>Total</b></td>
                <td></td>
                <td class="right"><b>${formatCurrency(norm.totalTax)}</b></td>
                <td class="right"><b>${formatCurrency(norm.total)}</b></td>
              </tr>
            </tfoot>
          </table>

          <div class="amounts">
            <div class="left">
              <div class="section-header" style="background:#f0f0f0;padding:6px 10px;border-bottom:1px solid #000;font-weight:bold;">TAX SUMMARY</div>
              <table class="tax-table" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th>HSN</th><th>Taxable</th><th>IGST%</th><th>IGST</th><th>CGST%</th><th>CGST</th><th>SGST%</th><th>SGST</th><th>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Basic tax summary calculated client-side -->
                </tbody>
              </table>
            </div>
            <div class="rightbox">
              <div class="section-header" style="background:#f0f0f0;padding:6px 10px;border-bottom:1px solid #000;font-weight:bold;">AMOUNT DETAILS</div>
              <div class="row"><span>Sub Total:</span><span>${formatCurrency(norm.subTotal)}</span></div>
              <div class="row"><span>Total Tax:</span><span>${formatCurrency(norm.totalTax)}</span></div>
              <div class="row"><span>Shipping:</span><span>${formatCurrency(norm.shippingCharges || 0)}</span></div>
              <div class="row"><span>Round Off:</span><span>${formatCurrency(invoice.roundOff || 0)}</span></div>
              <div class="row total"><span>Grand Total:</span><span>${formatCurrency(norm.total)}</span></div>
              <div class="row"><span>Received:</span><span>${formatCurrency(norm.paidAmount || 0)}</span></div>
              <div class="row"><span>Balance:</span><span>${formatCurrency((norm.total - (norm.paidAmount||0)) || 0)}</span></div>
            </div>
          </div>

          <div class="words">
            <div><b>Amount in Words:</b></div>
            <div>${invoice.amountInWords || ''}</div>
          </div>

          <div class="footer">
            <div class="box">
              <div class="section-header" style="background:#f0f0f0;padding:6px 10px;border-bottom:1px solid #000;font-weight:bold;">Bank Details</div>
              <div class="small"><b>Bank Name:</b> ${comp.bank?.name || ''}</div>
              <div class="small"><b>Account No:</b> ${comp.bank?.account || ''}</div>
              <div class="small"><b>IFSC:</b> ${comp.bank?.ifsc || ''}</div>
              <div class="small"><b>Account Holder:</b> ${comp.bank?.holder || ''}</div>
            </div>
            <div class="box" style="text-align:center;">
              <div class="section-header" style="background:#f0f0f0;padding:6px 10px;border-bottom:1px solid #000;font-weight:bold;">Payment QR</div>
              ${qrSrc ? `<img src="${qrSrc}" alt="UPI QR" style="max-width:120px;height:auto;"/>` : '<div class="small">QR not configured</div>'}
              <div class="small" style="margin-top:6px;">UPI ID: ${comp.upi?.id || ''}</div>
            </div>
          </div>

          <div class="box" style="border:1px solid #000; padding:10px; margin-top:12px;">
            <div class="section-header" style="background:#f0f0f0;padding:6px 10px;border-bottom:1px solid #000;font-weight:bold;">Terms & Conditions</div>
            <ol>
              ${(Array.isArray(comp.terms) ? comp.terms : []).map(t => `<li class="small">${t}</li>`).join('')}
            </ol>
          </div>

          <div class="no-print">
            <button onclick="window.print()">Print</button>
            <button onclick="window.close()">Close</button>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Print Invoice #{invoice?.invoiceNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Print Format Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Print Format
              </label>
              <select
                value={printFormat}
                onChange={(e) => setPrintFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="A5">A5 (Compact)</option>
                <option value="Thermal">Thermal (80mm)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Copies
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={printCopies}
                onChange={(e) => setPrintCopies(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Print Options */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Print Options</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.showGST}
                  onChange={(e) => setPrintOptions(prev => ({ ...prev, showGST: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show GST Details</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.showHSN}
                  onChange={(e) => setPrintOptions(prev => ({ ...prev, showHSN: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show HSN Codes</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.showDiscount}
                  onChange={(e) => setPrintOptions(prev => ({ ...prev, showDiscount: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Discounts</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.showShipping}
                  onChange={(e) => setPrintOptions(prev => ({ ...prev, showShipping: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Shipping</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeQR}
                  onChange={(e) => setIncludeQR(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include QR Code</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeTerms}
                  onChange={(e) => setIncludeTerms(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include Terms</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={printOptions.watermark}
                  onChange={(e) => setPrintOptions(prev => ({ ...prev, watermark: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Add Watermark</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={previewInvoice}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Preview Invoice
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Invoice Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Invoice Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Customer: {invoice?.customer?.name}</div>
              <div>Items: {invoice?.items?.length || 0}</div>
              <div>Amount: {formatCurrency(invoice?.total || 0)}</div>
              <div>Status: {invoice?.status}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedInvoicePrint;
