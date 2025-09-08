import React from 'react';
import { toast } from 'react-hot-toast';

const CopyButton = ({ textToCopy }) => {
  const handleCopy = () => {
    if (!textToCopy && typeof textToCopy !== 'number') return;
    navigator.clipboard.writeText(String(textToCopy)).then(() => {
      toast.success(`Copied "${String(textToCopy).substring(0, 20)}..."`, { duration: 1500 });
    }, (err) => {
      toast.error('Failed to copy!');
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <button onClick={handleCopy} className="ml-2 text-blue-500 hover:text-blue-700 transition-colors" title={`Copy ${textToCopy}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
    </button>
  );
};

const DataCell = ({ children }) => (
  <td className="p-2 border-t whitespace-nowrap">
    <div className="flex items-center">
      <span>{children}</span>
      <CopyButton textToCopy={children} />
    </div>
  </td>
);

const B2BTable = ({ data }) => (
  <div>
    <h4 className="text-md font-semibold mt-4 mb-2">B2B Invoices ({data.length})</h4>
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Recipient GSTIN</th>
            <th className="p-2 text-left">Invoice No.</th>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-right">Value</th>
            <th className="p-2 text-right">Taxable Value</th>
            <th className="p-2 text-right">IGST</th>
            <th className="p-2 text-right">CGST</th>
            <th className="p-2 text-right">SGST</th>
          </tr>
        </thead>
        <tbody>
          {data.map(party => 
            party.inv.map(invoice => {
              const taxable = invoice.itms.reduce((acc, i) => acc + i.itm_det.txval, 0);
              const igst = invoice.itms.reduce((acc, i) => acc + i.itm_det.iamt, 0);
              const cgst = invoice.itms.reduce((acc, i) => acc + i.itm_det.camt, 0);
              const sgst = invoice.itms.reduce((acc, i) => acc + i.itm_det.samt, 0);
              return (
                <tr key={invoice.inum} className="hover:bg-gray-50">
                  <DataCell>{party.ctin}</DataCell>
                  <DataCell>{invoice.inum}</DataCell>
                  <td className="p-2 border-t">{invoice.idt}</td>
                  <DataCell>{invoice.val.toFixed(2)}</DataCell>
                  <DataCell>{taxable.toFixed(2)}</DataCell>
                  <DataCell>{igst.toFixed(2)}</DataCell>
                  <DataCell>{cgst.toFixed(2)}</DataCell>
                  <DataCell>{sgst.toFixed(2)}</DataCell>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const B2CLTable = ({ data }) => (
    <div>
      <h4 className="text-md font-semibold mt-4 mb-2">B2C Large Invoices ({data.length})</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Invoice No.</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-right">Value</th>
              <th className="p-2 text-left">Place of Supply</th>
              <th className="p-2 text-right">Taxable Value</th>
              <th className="p-2 text-right">IGST</th>
            </tr>
          </thead>
          <tbody>
            {data.map(party => 
              party.inv.map(invoice => {
                const taxable = invoice.itms.reduce((acc, i) => acc + i.itm_det.txval, 0);
                const igst = invoice.itms.reduce((acc, i) => acc + i.itm_det.iamt, 0);
                return (
                  <tr key={invoice.inum} className="hover:bg-gray-50">
                    <DataCell>{invoice.inum}</DataCell>
                    <td className="p-2 border-t">{invoice.idt}</td>
                    <DataCell>{invoice.val.toFixed(2)}</DataCell>
                    <DataCell>{invoice.pos}</DataCell>
                    <DataCell>{taxable.toFixed(2)}</DataCell>
                    <DataCell>{igst.toFixed(2)}</DataCell>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

const B2CSTable = ({ data }) => (
    <div>
      <h4 className="text-md font-semibold mt-4 mb-2">B2C Small Invoices ({data.length})</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Place of Supply</th>
              <th className="p-2 text-right">Tax Rate</th>
              <th className="p-2 text-right">Taxable Value</th>
              <th className="p-2 text-right">IGST</th>
              <th className="p-2 text-right">CGST</th>
              <th className="p-2 text-right">SGST</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <DataCell>{row.pos}</DataCell>
                <DataCell>{row.rt}</DataCell>
                <DataCell>{row.txval.toFixed(2)}</DataCell>
                <DataCell>{row.iamt.toFixed(2)}</DataCell>
                <DataCell>{row.camt.toFixed(2)}</DataCell>
                <DataCell>{row.samt.toFixed(2)}</DataCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

const Gstr1OnlineFiling = ({ data }) => {
  if (!data) return <div className="text-sm text-gray-600">No GSTR-1 data loaded.</div>;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800">A Comprehensive Guide to Filing GSTR-1 Online</h3>
        <p className="text-xs text-gray-600 mt-1">This guide will walk you through using this helper to file your GSTR-1 return directly on the GST Portal.</p>
        
        <div className="mt-4 text-sm text-gray-700 space-y-4">
          <div>
            <h4 className="font-semibold">Phase 1: Getting Started on the GST Portal</h4>
            <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
              <li><b>Log In:</b> Open the <a href="https://www.gst.gov.in/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">official GST Portal</a> in a new browser tab and log in with your credentials.</li>
              <li><b>Navigate to Returns:</b> From your dashboard, go to <b>Services &gt; Returns &gt; Returns Dashboard</b>.</li>
              <li><b>Select Period:</b> Choose the <b>Financial Year</b> and <b>Return Filing Period</b> (Month) that matches the dates you selected on this page, then click <b>Search</b>.</li>
              <li><b>Choose Online Preparation:</b> In the GSTR-1 tile, click on <b>PREPARE ONLINE</b>.</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold">Phase 2: Adding B2B Invoices (Business-to-Business)</h4>
            <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
              <li><b>Open B2B Section:</b> On the GSTR-1 summary page, click on the tile named <b>"4A, 4B, 4C, 6B, 6C - B2B Invoices"</b>.</li>
              <li><b>Add Invoice:</b> Click the <b>Add Invoice</b> button.</li>
              <li><b>Copy and Paste Details:</b> Use the <b>"B2B Invoices"</b> table below. For each invoice:
                <ul className="list-disc list-inside pl-4">
                  <li>Click the copy icon next to the <b>Recipient GSTIN</b> and paste it into the "Receiver GSTIN/UIN" field on the portal. The receiver's name should auto-fill.</li>
                  <li>Copy the <b>Invoice No.</b> and paste it.</li>
                  <li>Enter the <b>Invoice Date</b> manually.</li>
                  <li>Copy the <b>Invoice Value</b> and paste it into the "Total Invoice Value" field.</li>
                </ul>
              </li>
              <li><b>Add Item Details:</b>
                <ul className="list-disc list-inside pl-4">
                  <li>Scroll down to the "Invoice Details" section on the portal.</li>
                  <li>For each invoice, this tool aggregates the total Taxable Value and tax amounts (IGST, CGST, SGST).</li>
                  <li>Select the correct <b>Tax Rate</b> from the dropdown on the portal.</li>
                  <li>Copy the <b>Taxable Value</b> from the table below and paste it.</li>
                  <li>The portal will auto-calculate the tax amounts. Verify they match the amounts shown in the table.</li>
                </ul>
              </li>
              <li><b>Save Invoice:</b> Click <b>Save</b>. You will be taken back to the B2B summary page. Repeat for all B2B invoices.</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold">Phase 3: Adding B2C (Large) Invoices</h4>
            <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
              <li><b>Open B2C Large Section:</b> Go back to the GSTR-1 summary and click on <b>"5A, 5B - B2C (Large) Invoices"</b>.</li>
              <li><b>Add Invoice:</b> Click <b>Add Invoice</b>.</li>
              <li><b>Copy and Paste Details:</b> Use the <b>"B2C Large Invoices"</b> table below. For each invoice, copy and paste the details just as you did for B2B invoices.</li>
              <li><b>Save Invoice:</b> Click <b>Save</b> and repeat for all B2C Large invoices.</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold">Phase 4: Adding B2C (Small) Summary</h4>
            <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
              <li><b>Open B2C Small Section:</b> Go back to the GSTR-1 summary and click on <b>"7 - B2C (Others)"</b>.</li>
              <li><b>Add Details:</b> Click <b>Add Details</b>.</li>
              <li><b>Copy and Paste Details:</b> Use the <b>"B2C Small Invoices"</b> table below. For each row in the table, select the <b>Place of Supply (POS)</b> and <b>Tax Rate</b>, then copy and paste the corresponding <b>Taxable Value</b>.</li>
              <li><b>Save</b> and repeat for each Place of Supply / Tax Rate combination shown in the table.</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold">Phase 5: Finalizing Your Return</h4>
            <ol className="list-decimal list-inside mt-1 space-y-1 pl-2">
              <li><b>Generate Summary:</b> After adding all data, go back to the GSTR-1 summary page and click <b>GENERATE GSTR1 SUMMARY</b> at the bottom. This can take a few minutes.</li>
              <li><b>Preview and Submit:</b> Once the summary is generated (the status will update), tick the acknowledgement checkbox, and click <b>PREVIEW</b> to review a draft PDF.</li>
              <li><b>Submit:</b> If everything is correct, click <b>SUBMIT</b>. Note: Once submitted, you cannot make any changes.</li>
              <li><b>File Return:</b> After submitting, click <b>FILE RETURN</b>. You can then file the return using either <b>DSC</b> (Digital Signature Certificate) or <b>EVC</b> (Electronic Verification Code).</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500 italic mt-4">*This guide is for informational purposes. Always refer to the official GST portal for the latest procedures.*</p>
        </div>
      </div>

      {data.b2b && data.b2b.length > 0 && <B2BTable data={data.b2b} />}
      {data.b2cl && data.b2cl.length > 0 && <B2CLTable data={data.b2cl} />}
      {data.b2cs && data.b2cs.length > 0 && <B2CSTable data={data.b2cs} />}
      {/* Add tables for other sections like Exports, CDNR etc. as needed */}
    </div>
  );
};

export default Gstr1OnlineFiling;
