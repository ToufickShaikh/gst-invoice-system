import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { portalAPI } from '../api/portal';

const PortalStatement = () => {
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setError('');
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const res = await portalAPI.getPublicStatement(customerId, { from, to });
        setData(res);
      } catch (e) {
        setError(e?.response?.data?.message || 'Unable to load statement');
      }
    }
    load();
  }, [customerId, searchParams]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  const { company, customer, invoices, summary, period } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
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
            <div className="text-xl font-bold">Account Statement</div>
            <div className="text-sm text-gray-600">{new Date(period.from).toLocaleDateString('en-IN')} - {new Date(period.to).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="font-semibold">Customer</div>
            <div>{customer.firmName || customer.name}</div>
            <div className="text-sm text-gray-600">{customer.billingAddress || customer.firmAddress}</div>
            {customer.gstNo && <div className="text-sm text-gray-600">GSTIN: {customer.gstNo}</div>}
          </div>
          <div className="text-right">
            <div className="text-sm">Total: <span className="font-semibold">₹{summary.total.toFixed(2)}</span></div>
            <div className="text-sm">Paid: <span className="font-semibold">₹{summary.paid.toFixed(2)}</span></div>
            <div className="text-base">Balance: <span className="font-bold">₹{summary.balance.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">Date</th>
                <th className="px-2 py-2 text-left">Invoice #</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 text-right">Paid</th>
                <th className="px-2 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const total = Number(inv.grandTotal || inv.totalAmount || 0);
                const paid = Number(inv.paidAmount || 0);
                const bal = Number(inv.balance ?? (total - paid));
                return (
                  <tr key={inv._id} className="border-t">
                    <td className="px-2 py-2">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-2 py-2">{inv.invoiceNumber}</td>
                    <td className="px-2 py-2 text-right">₹{total.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">₹{paid.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">₹{bal.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PortalStatement;
