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
        <h3 className="text-lg font-semibold text-blue-800">How to File GSTR-1 Online</h3>
        <ol className="list-decimal list-inside mt-2 text-sm text-gray-700 space-y-1">
          <li>Open the official GST Portal in a new browser window and navigate to the GSTR-1 filing page for the correct period.</li>
          <li>Use the tables below to fill in the data for each section (B2B, B2C Large, etc.).</li>
          <li>Click the copy icon next to any value to copy it to your clipboard, then paste it into the corresponding field on the portal.</li>
          <li>After filling all sections, review the data on the portal and submit your return.</li>
        </ol>
      </div>

      {data.b2b && data.b2b.length > 0 && <B2BTable data={data.b2b} />}
      {data.b2cl && data.b2cl.length > 0 && <B2CLTable data={data.b2cl} />}
      {data.b2cs && data.b2cs.length > 0 && <B2CSTable data={data.b2cs} />}
      {/* Add tables for other sections like Exports, CDNR etc. as needed */}
    </div>
  );
};

export default Gstr1OnlineFiling;
