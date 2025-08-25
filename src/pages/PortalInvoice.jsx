import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { portalAPI } from '../api/portal';

const PortalInvoice = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try { setError(''); const res = await portalAPI.getPublicInvoice(id); setData(res); }
      catch (e) { setError(e?.response?.data?.message || 'Unable to load invoice'); }
    }
    load();
  }, [id]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  const { invoice, company, payment, pdfUrl } = data;
  const cust = invoice.customer || {};

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {company.logoUrl && <img src={company.logoUrl} alt="logo" className="h-10" />}
            <div>
              <div className="font-bold text-lg">{company.name}</div>
              <div className="text-xs text-gray-600">{company.address}</div>
              {company.gstin && <div className="text-xs text-gray-600">GSTIN: {company.gstin}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">Invoice</div>
            <div className="text-sm text-gray-600">{invoice.invoiceNumber}</div>
            <div className="text-sm text-gray-600">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="font-semibold">Bill To</div>
            <div>{cust.firmName || cust.name}</div>
            <div className="text-sm text-gray-600">{cust.billingAddress || cust.firmAddress}</div>
            {cust.gstNo && <div className="text-sm text-gray-600">GSTIN: {cust.gstNo}</div>}
          </div>
          <div className="text-right">
            <a href={pdfUrl} className="inline-block px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600" target="_blank" rel="noreferrer">Download PDF</a>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items||[]).map((it, idx) => {
                const qty = Number(it.quantity||0); const rate = Number(it.rate||0);
                return (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-2">{it.item?.name || it.name}</td>
                    <td className="px-2 py-2 text-right">{qty}</td>
                    <td className="px-2 py-2 text-right">₹{rate.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">₹{(qty*rate).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <div>
            <div className="flex justify-between gap-12"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{(invoice.subTotal||0).toFixed(2)}</span></div>
            <div className="flex justify-between gap-12"><span className="text-gray-600">CGST</span><span className="font-semibold">₹{(invoice.cgst||0).toFixed(2)}</span></div>
            <div className="flex justify-between gap-12"><span className="text-gray-600">SGST</span><span className="font-semibold">₹{(invoice.sgst||0).toFixed(2)}</span></div>
            <div className="flex justify-between gap-12"><span className="text-gray-600">IGST</span><span className="font-semibold">₹{(invoice.igst||0).toFixed(2)}</span></div>
            <div className="flex justify-between gap-12 text-lg"><span className="font-semibold">Total</span><span className="font-bold">₹{(invoice.grandTotal||invoice.totalAmount||0).toFixed(2)}</span></div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Pay Now</div>
          {payment?.qrCodeImage ? (
            <div className="flex items-center gap-4">
              <img src={payment.qrCodeImage} alt="UPI QR" className="w-40 h-40" />
              <div className="text-sm text-gray-600">
                <div>UPI ID: {payment.upiId || 'Not configured'}</div>
                <div>Balance: ₹{(payment.balance||0).toFixed(2)}</div>
                <div className="mt-2 text-xs">Scan with any UPI app to pay. Amount is auto-filled when balance is due.</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Payment QR not available.</div>
          )}
        </div>

        {Array.isArray(company.terms) && company.terms.length > 0 && (
          <div className="mt-6">
            <div className="font-semibold mb-2">Terms & Conditions</div>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              {company.terms.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalInvoice;
