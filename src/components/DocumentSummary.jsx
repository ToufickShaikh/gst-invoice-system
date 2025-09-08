import React, { useState } from 'react';
import Button from './Button';

const DocumentSummary = ({ data }) => {
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  if (!data?.documents) return null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  // Filter and sort the data
  const filteredDocs = data.documents.filter(doc => 
    doc.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.party?.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle date field
    if (sortField === 'date') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    }
    // Handle numeric fields
    else if (['taxableValue', 'totalTax', 'total'].includes(sortField)) {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const displayDocs = showAll ? sortedDocs : sortedDocs.slice(0, 10);
  const totals = data.documents.reduce((acc, doc) => ({
    taxableValue: acc.taxableValue + Number(doc.taxableValue || 0),
    totalTax: acc.totalTax + Number(doc.totalTax || 0),
    total: acc.total + Number(doc.total || 0)
  }), { taxableValue: 0, totalTax: 0, total: 0 });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const SortableHeader = ({ field, children }) => (
    <th 
      className="p-2 text-left cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search Invoice No, Party or GSTIN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          />
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'Show All'}
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Total Documents: {filteredDocs.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <SortableHeader field="date">Date</SortableHeader>
              <SortableHeader field="number">Document No</SortableHeader>
              <SortableHeader field="type">Type</SortableHeader>
              <th className="p-2">Party Name</th>
              <th className="p-2">GSTIN</th>
              <th className="p-2">Place of Supply</th>
              <SortableHeader field="taxableValue">Taxable Value</SortableHeader>
              <th className="p-2 text-right">IGST</th>
              <th className="p-2 text-right">CGST</th>
              <th className="p-2 text-right">SGST</th>
              <SortableHeader field="total">Total</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {displayDocs.map((doc, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-2">{formatDate(doc.date)}</td>
                <td className="p-2">{doc.number}</td>
                <td className="p-2">{doc.type}</td>
                <td className="p-2">{doc.party?.name}</td>
                <td className="p-2 font-mono">{doc.party?.gstin}</td>
                <td className="p-2">{doc.placeOfSupply}</td>
                <td className="p-2 text-right">₹{Number(doc.taxableValue||0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{Number(doc.igst||0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{Number(doc.cgst||0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{Number(doc.sgst||0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{Number(doc.total||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 font-semibold bg-gray-50">
            <tr>
              <td colSpan="6" className="p-2 text-right">Totals:</td>
              <td className="p-2 text-right">₹{totals.taxableValue.toFixed(2)}</td>
              <td colSpan="3"></td>
              <td className="p-2 text-right">₹{totals.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DocumentSummary;
