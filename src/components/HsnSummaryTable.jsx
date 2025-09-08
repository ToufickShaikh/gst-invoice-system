import React, { useState } from 'react';
import Button from './Button';

const HsnSummaryTable = ({ data }) => {
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('hsn');
  const [sortDirection, setSortDirection] = useState('asc');

  if (!data?.rows) return null;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort the data
  const filteredRows = data.rows.filter(row => 
    row.hsn?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedRows = [...filteredRows].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle numeric fields
    if (['quantity', 'taxRate', 'taxableValue', 'taxAmount'].includes(sortField)) {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const displayRows = showAll ? sortedRows : sortedRows.slice(0, 10);
  const totals = data.rows.reduce((acc, row) => ({
    quantity: acc.quantity + Number(row.quantity || 0),
    taxableValue: acc.taxableValue + Number(row.taxableValue || 0),
    taxAmount: acc.taxAmount + Number(row.taxAmount || 0)
  }), { quantity: 0, taxableValue: 0, taxAmount: 0 });

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
            placeholder="Search HSN or Description..."
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
          Total Items: {filteredRows.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <SortableHeader field="hsn">HSN Code</SortableHeader>
              <SortableHeader field="description">Description</SortableHeader>
              <th className="p-2 text-right">UQC</th>
              <SortableHeader field="quantity">Total Quantity</SortableHeader>
              <SortableHeader field="taxRate">Tax Rate %</SortableHeader>
              <SortableHeader field="taxableValue">Taxable Value</SortableHeader>
              <SortableHeader field="taxAmount">Tax Amount</SortableHeader>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                <td className="p-2">{row.hsn}</td>
                <td className="p-2 max-w-xs truncate" title={row.description}>
                  {row.description}
                </td>
                <td className="p-2 text-right">{row.uqc || 'PCS'}</td>
                <td className="p-2 text-right">{Number(row.quantity||0).toFixed(2)}</td>
                <td className="p-2 text-right">{Number(row.taxRate||0).toFixed(2)}%</td>
                <td className="p-2 text-right">₹{Number(row.taxableValue||0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{Number(row.taxAmount||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 font-semibold bg-gray-50">
            <tr>
              <td colSpan="3" className="p-2 text-right">Totals:</td>
              <td className="p-2 text-right">{totals.quantity.toFixed(2)}</td>
              <td className="p-2"></td>
              <td className="p-2 text-right">₹{totals.taxableValue.toFixed(2)}</td>
              <td className="p-2 text-right">₹{totals.taxAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default HsnSummaryTable;
