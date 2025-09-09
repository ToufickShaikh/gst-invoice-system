import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Button from '../components/Button';
import { toast } from 'react-hot-toast';
import axiosInstance from '../api/axiosInstance';
import Gstr1OnlineFiling from '../components/Gstr1OnlineFiling';
import HsnSummaryTable from '../components/HsnSummaryTable';
import DocumentSummary from '../components/DocumentSummary';

const fmtDate = (d) => new Date(d).toISOString().slice(0,10);

const usePeriod = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Default to the start and end of the previous month
  const firstDayOfPreviousMonth = new Date(year, month - 1, 1);
  const lastDayOfPreviousMonth = new Date(year, month, 0);

  const [from, setFrom] = useState(fmtDate(firstDayOfPreviousMonth));
  const [to, setTo] = useState(fmtDate(lastDayOfPreviousMonth));
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
  const [docSummary, setDocSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const params = { params: { from, to } };
      console.info('[GST UI] Fetching GSTR data for', from, '->', to);
      const [r1, r3b, rhsn, rdocs] = await Promise.all([
        axiosInstance.get('/gst/returns/gstr1', params),
        axiosInstance.get('/gst/returns/gstr3b', params),
        axiosInstance.get('/gst/returns/hsn-summary', params),
        axiosInstance.get('/gst/returns/document-summary', params),
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
      setDocSummary(rdocs.data || null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch GST returns');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial load and whenever the date range changes.
  const memoizedFetchAll = React.useCallback(fetchAll, [from, to]);
  useEffect(() => {
    if (from && to) {
      // Use the memoized version to ensure it has the latest from/to values
      memoizedFetchAll();
    }
  }, [from, to, memoizedFetchAll]);

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
        <div className="flex flex-col gap-4">
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
              <Button onClick={() => fetchAll()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
            </div>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {['summary', 'gstr1', 'documents', 'hsn'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {tab === 'summary' ? 'Summary' :
                   tab === 'gstr1' ? 'GSTR-1 Filing' :
                   tab === 'documents' ? 'Document List' :
                   'HSN Summary'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'summary' && (
          <Section title="GSTR-3B Summary">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Sum label="Taxable Turnover" value={gstr3b?.summary?.outwardTaxableSupplies||0} className="bg-blue-50" />
                <Sum label="Total Tax" value={(gstr3b?.summary?.igst||0) + (gstr3b?.summary?.cgst||0) + (gstr3b?.summary?.sgst||0)} className="bg-green-50" />
                <Sum label="Total Invoices" value={docSummary?.totalCount || 0} className="bg-purple-50" />
                <Sum label="HSN Codes" value={hsn?.rows?.length || 0} className="bg-yellow-50" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Tax Breakdown</h3>
                  <div className="bg-white p-4 rounded-lg border space-y-2">
                    <div className="flex justify-between"><span>IGST:</span><span className="font-semibold">₹{(gstr3b?.summary?.igst||0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>CGST:</span><span className="font-semibold">₹{(gstr3b?.summary?.cgst||0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>SGST:</span><span className="font-semibold">₹{(gstr3b?.summary?.sgst||0).toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span>Total:</span><span className="font-semibold">₹{((gstr3b?.summary?.igst||0) + (gstr3b?.summary?.cgst||0) + (gstr3b?.summary?.sgst||0)).toFixed(2)}</span></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-700">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => setActiveTab('gstr1')}>
                      GSTR-1 Filing
                    </Button>
                    <Button variant="outline" onClick={() => dl('/gst/returns/gstr1', `gstr1-${from}-${to}.json`)}>
                      Export GSTR-1
                    </Button>
                    <Button variant="outline" onClick={() => dl('/gst/returns/gstr3b', `gstr3b-${from}-${to}.json`)}>
                      Export GSTR-3B
                    </Button>
                    <Button variant="outline" onClick={() => dl('/gst/returns/hsn-summary', `hsn-${from}-${to}.json`)}>
                      Export HSN
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {activeTab === 'gstr1' && (
          <Section title="GSTR-1 Online Filing Helper">
            <Gstr1OnlineFiling data={gstr1} />
          </Section>
        )}

        {activeTab === 'documents' && (
          <Section 
            title="Document Summary" 
            actions={(
              <Button variant="outline" onClick={() => dl('/gst/returns/document-list', `documents-${from}-${to}.csv`, { format: 'csv' })}>
                Export CSV
              </Button>
            )}
          >
            <DocumentSummary data={docSummary} />
          </Section>
        )}

        {activeTab === 'hsn' && (
          <Section
            title="HSN Summary"
            actions={(
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => dl('/gst/returns/hsn-summary', `hsn-${from}-${to}.json`)}>Export JSON</Button>
                <Button variant="outline" onClick={() => dl('/gst/returns/hsn-summary', `hsn-${from}-${to}.csv`, { format: 'csv' })}>Export CSV</Button>
              </div>
            )}
          >
            <HsnSummaryTable data={hsn} />
          </Section>
        )}
      </div>
    </Layout>
  );
};

export default GstFilings;
