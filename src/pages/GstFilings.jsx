import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import Gstr1OnlineFiling from '../components/Gstr1OnlineFiling';

const fmtDate = (d) => new Date(d).toISOString().slice(0,10);

const usePeriod = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(fmtDate(firstDay));
  const [to, setTo] = useState(fmtDate(now));
  return { from, setFrom, to, setTo };
};

const Section = ({ title, children, actions }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {actions}
    </div>
    {children}
  </div>
);

const GstFilings = () => {
  const { from, setFrom, to, setTo } = usePeriod();
  const [loading, setLoading] = useState(false);
  const [gstr1, setGstr1] = useState(null);
  const [gstr3b, setGstr3b] = useState(null);
  const [hsn, setHsn] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const params = { params: { from, to } };
      console.info('[GST UI] Fetching GSTR data for', from, '->', to);
      const [r1, r3b, rhsn] = await Promise.all([
        axiosInstance.get('/gst/returns/gstr1', params),
        axiosInstance.get('/gst/returns/gstr3b', params),
        axiosInstance.get('/gst/returns/hsn-summary', params),
      ]).catch(err => {
        console.error('[GST UI] Error fetching GST endpoints', err);
        throw err;
      });
      console.debug('[GST UI] gstr1 response', r1?.data);
      console.debug('[GST UI] gstr3b response', r3b?.data);
      console.debug('[GST UI] hsn response', rhsn?.data);
      setGstr1(r1.data || null);
      setGstr3b(r3b.data || null);
      setHsn(rhsn.data || null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch GST returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const dl = async (path, name, extraParams = {}) => {
    const toastId = toast.loading(`Downloading ${name}...`);
    try {
      const response = await axiosInstance.get(path, {
        params: { from, to, ...extraParams },
        responseType: 'blob', // Important for file downloads
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully downloaded ${name}`, { id: toastId });
    } catch (err) {
      console.error('Download failed', err);
      toast.error(`Failed to download ${name}. Please check console for details.`, { id: toastId });
    }
  };

  const Sum = ({ label, value, className='' }) => (
    <div className={`p-3 rounded border ${className}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{typeof value === 'number' ? value.toFixed(2) : value}</div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">GST Filings</h1>
            <p className="text-gray-600">Prepare GSTR-1, 3B and HSN summary exports</p>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-600">From</label>
              <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-600">To</label>
              <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <Button onClick={fetchAll} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
          </div>
        </div>

        <Section title="GSTR-1 Online Filing Helper">
          <Gstr1OnlineFiling data={gstr1} />
        </Section>

        <Section
          title="GSTR-3B Summary"
          actions={(
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => dl('/gst/returns/gstr3b', `gstr3b-${from}-${to}.json`)}>Download JSON</Button>
              <Button variant="outline" onClick={() => dl('/gst/returns/gstr3b', `gstr3b-${from}-${to}.csv`, { format: 'csv' })}>Download CSV</Button>
            </div>
          )}
        >
          {!gstr3b ? (
            <div className="text-sm text-gray-600">No data</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Sum label="Taxable" value={gstr3b.summary?.outwardTaxableSupplies||0} />
              <Sum label="IGST" value={gstr3b.summary?.igst||0} />
              <Sum label="CGST" value={gstr3b.summary?.cgst||0} />
              <Sum label="SGST" value={gstr3b.summary?.sgst||0} />
              <Sum label="Exempt/Nil" value={gstr3b.summary?.exemptNil||0} />
            </div>
          )}
        </Section>

        <Section
          title="HSN Summary"
          actions={(
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => dl('/gst/returns/hsn-summary', `hsn-${from}-${to}.json`)}>Download JSON</Button>
              <Button variant="outline" onClick={() => dl('/gst/returns/hsn-summary', `hsn-${from}-${to}.csv`, { format: 'csv' })}>Download CSV</Button>
            </div>
          )}
        >
          {!hsn ? (
            <div className="text-sm text-gray-600">No data</div>
          ) : (
            <div>
              <div className="text-xs text-gray-500 mb-2">Showing first 10 rows</div>
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left p-2">HSN</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Tax Rate %</th>
                      <th className="text-right p-2">Taxable Value</th>
                      <th className="text-right p-2">Tax Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hsn.rows||[]).slice(0,10).map((r,i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.hsn}</td>
                        <td className="p-2">{r.description}</td>
                        <td className="p-2 text-right">{Number(r.quantity||0).toFixed(2)}</td>
                        <td className="p-2 text-right">{Number(r.taxRate||0).toFixed(2)}</td>
                        <td className="p-2 text-right">{Number(r.taxableValue||0).toFixed(2)}</td>
                        <td className="p-2 text-right">{Number(r.taxAmount||0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      </div>
    </Layout>
  );
};

export default GstFilings;
