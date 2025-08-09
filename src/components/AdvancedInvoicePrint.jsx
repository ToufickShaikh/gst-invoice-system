import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '../utils/dateHelpers';

const AdvancedInvoicePrint = ({ invoice, onClose, isVisible = false }) => {
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const generatePDF = () => {
    if (!invoice) {
      toast.error('No invoice data available');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: printFormat === 'A4' ? 'a4' : printFormat === 'A5' ? 'a5' : [80, 200]
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Company Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(invoice.company?.name || 'SHAIKH CARPETS', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoice.company?.address || 'Your Company Address', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 5;
      pdf.text(`Phone: ${invoice.company?.phone || '+91-XXXXXXXXXX'} | Email: ${invoice.company?.email || 'info@company.com'}`, pageWidth / 2, yPosition, { align: 'center' });
      
      if (printOptions.showGST && invoice.company?.gstin) {
        yPosition += 5;
        pdf.text(`GSTIN: ${invoice.company.gstin}`, pageWidth / 2, yPosition, { align: 'center' });
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

      // Left side - Invoice details
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Invoice No: ${invoice.invoiceNumber}`, 15, yPosition + 6);
      pdf.text(`Date: ${formatDate(invoice.date)}`, 15, yPosition + 12);
      pdf.text(`Due Date: ${formatDate(invoice.dueDate)}`, 15, yPosition + 18);

      // Right side - Customer details
      const rightX = pageWidth / 2 + 10;
      pdf.text('Bill To:', rightX, yPosition + 6);
      pdf.setFont('helvetica', 'bold');
      pdf.text(invoice.customer?.name || 'Customer Name', rightX, yPosition + 12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoice.customer?.phone || '', rightX, yPosition + 18);

      // Customer Address Box
      yPosition += detailsBoxHeight + 5;
      const addressBoxHeight = 20;
      pdf.rect(10, yPosition, pageWidth - 20, addressBoxHeight);
      pdf.text('Billing Address:', 15, yPosition + 6);
      const customerAddress = invoice.customer?.address || 'Customer Address';
      const addressLines = pdf.splitTextToSize(customerAddress, pageWidth - 30);
      pdf.text(addressLines, 15, yPosition + 12);

      // Items Table
      yPosition += addressBoxHeight + 10;
      
      const tableColumns = [
        'Item',
        ...(printOptions.showHSN ? ['HSN'] : []),
        'Qty',
        'Rate',
        ...(printOptions.showDiscount ? ['Disc%'] : []),
        ...(printOptions.showGST ? ['Tax%'] : []),
        'Amount'
      ];

      const tableData = invoice.items?.map((item, index) => {
        const row = [
          item.name || `Item ${index + 1}`,
          ...(printOptions.showHSN ? [item.hsnCode || ''] : []),
          item.quantity || 1,
          formatCurrency(item.rate || 0),
          ...(printOptions.showDiscount ? [`${item.discount || 0}%`] : []),
          ...(printOptions.showGST ? [`${item.taxRate || 0}%`] : []),
          formatCurrency(item.amount || 0)
        ];
        return row;
      }) || [];

      pdf.autoTable({
        head: [tableColumns],
        body: tableData,
        startY: yPosition,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 'auto' }, // Item name
          [tableColumns.length - 1]: { halign: 'right' } // Amount column
        }
      });

      // Calculate totals
      const subtotal = invoice.subtotal || 0;
      const discount = invoice.discountAmount || 0;
      const shipping = invoice.shippingCharges || 0;
      const taxAmount = invoice.taxAmount || 0;
      const total = invoice.total || 0;

      // Totals section
      yPosition = pdf.lastAutoTable.finalY + 10;
      const totalsX = pageWidth - 60;
      
      pdf.setFontSize(9);
      pdf.text('Subtotal:', totalsX, yPosition);
      pdf.text(formatCurrency(subtotal), pageWidth - 15, yPosition, { align: 'right' });
      
      if (printOptions.showDiscount && discount > 0) {
        yPosition += 5;
        pdf.text('Discount:', totalsX, yPosition);
        pdf.text(`-${formatCurrency(discount)}`, pageWidth - 15, yPosition, { align: 'right' });
      }
      
      if (printOptions.showShipping && shipping > 0) {
        yPosition += 5;
        pdf.text('Shipping:', totalsX, yPosition);
        pdf.text(formatCurrency(shipping), pageWidth - 15, yPosition, { align: 'right' });
      }
      
      if (printOptions.showGST && taxAmount > 0) {
        yPosition += 5;
        pdf.text('Tax Amount:', totalsX, yPosition);
        pdf.text(formatCurrency(taxAmount), pageWidth - 15, yPosition, { align: 'right' });
      }
      
      yPosition += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Total:', totalsX, yPosition);
      pdf.text(formatCurrency(total), pageWidth - 15, yPosition, { align: 'right' });

      // Payment Info
      if (invoice.paymentMethod || invoice.paidAmount) {
        yPosition += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text('Payment Details:', 15, yPosition);
        yPosition += 5;
        if (invoice.paymentMethod) {
          pdf.text(`Method: ${invoice.paymentMethod}`, 15, yPosition);
        }
        if (invoice.paidAmount > 0) {
          yPosition += 5;
          pdf.text(`Paid: ${formatCurrency(invoice.paidAmount)}`, 15, yPosition);
          pdf.text(`Balance: ${formatCurrency(total - invoice.paidAmount)}`, 15, yPosition + 5);
        }
      }

      // QR Code placeholder (if includeQR is true)
      if (includeQR) {
        yPosition += 15;
        pdf.rect(15, yPosition, 25, 25);
        pdf.setFontSize(8);
        pdf.text('QR Code', 17, yPosition + 13);
        pdf.text('Pay via UPI', pageWidth - 50, yPosition + 8);
        pdf.text(`UPI ID: ${invoice.company?.upiId || 'company@upi'}`, pageWidth - 50, yPosition + 13);
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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
          .customer-details { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .totals { text-align: right; margin: 20px 0; }
          .total-row { font-weight: bold; font-size: 18px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${invoice.company?.name || 'SHAIKH CARPETS'}</div>
          <div>${invoice.company?.address || 'Your Company Address'}</div>
          <div>Phone: ${invoice.company?.phone || '+91-XXXXXXXXXX'} | Email: ${invoice.company?.email || 'info@company.com'}</div>
          ${printOptions.showGST && invoice.company?.gstin ? `<div>GSTIN: ${invoice.company.gstin}</div>` : ''}
        </div>
        
        <h2 style="text-align: center;">TAX INVOICE</h2>
        
        <div class="invoice-details">
          <div>
            <strong>Invoice No:</strong> ${invoice.invoiceNumber}<br>
            <strong>Date:</strong> ${formatDate(invoice.date)}<br>
            <strong>Due Date:</strong> ${formatDate(invoice.dueDate)}
          </div>
          <div>
            <strong>Bill To:</strong><br>
            <strong>${invoice.customer?.name || 'Customer Name'}</strong><br>
            ${invoice.customer?.phone || ''}
          </div>
        </div>
        
        <div class="customer-details">
          <strong>Billing Address:</strong><br>
          ${invoice.customer?.address || 'Customer Address'}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              ${printOptions.showHSN ? '<th>HSN</th>' : ''}
              <th>Qty</th>
              <th>Rate</th>
              ${printOptions.showDiscount ? '<th>Disc%</th>' : ''}
              ${printOptions.showGST ? '<th>Tax%</th>' : ''}
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items?.map(item => `
              <tr>
                <td>${item.name}</td>
                ${printOptions.showHSN ? `<td>${item.hsnCode || ''}</td>` : ''}
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.rate)}</td>
                ${printOptions.showDiscount ? `<td>${item.discount || 0}%</td>` : ''}
                ${printOptions.showGST ? `<td>${item.taxRate || 0}%</td>` : ''}
                <td>${formatCurrency(item.amount)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <div class="totals">
          <div>Subtotal: ${formatCurrency(invoice.subtotal || 0)}</div>
          ${printOptions.showDiscount && invoice.discountAmount > 0 ? `<div>Discount: -${formatCurrency(invoice.discountAmount)}</div>` : ''}
          ${printOptions.showShipping && invoice.shippingCharges > 0 ? `<div>Shipping: ${formatCurrency(invoice.shippingCharges)}</div>` : ''}
          ${printOptions.showGST && invoice.taxAmount > 0 ? `<div>Tax Amount: ${formatCurrency(invoice.taxAmount)}</div>` : ''}
          <div class="total-row">Total: ${formatCurrency(invoice.total || 0)}</div>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()">Print Invoice</button>
          <button onclick="window.close()">Close</button>
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
