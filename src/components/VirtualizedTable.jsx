import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { formatCurrency } from '../utils/dateHelpers';

/**
 * High-performance virtualized table for large datasets
 * Renders only visible rows for optimal performance
 */

const VirtualizedTable = memo(({
  data,
  columns,
  height = 600,
  itemHeight = 60,
  onRowClick,
  selectedRows = new Set(),
  onRowSelect,
  loading = false,
  emptyMessage = "No data available"
}) => {
  const memoizedData = useMemo(() => data || [], [data]);
  
  const Row = memo(({ index, style }) => {
    const item = memoizedData[index];
    const isSelected = selectedRows.has(item._id);
    
    return (
      <div
        style={style}
        className={`
          flex items-center border-b hover:bg-gray-50 cursor-pointer
          ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'border-gray-200'}
        `}
        onClick={() => onRowClick?.(item)}
      >
        {onRowSelect && (
          <div className="w-12 flex justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onRowSelect(item._id, e.target.checked);
              }}
              className="rounded"
            />
          </div>
        )}
        
        {columns.map((column) => (
          <div
            key={column.key}
            className={`flex-1 px-3 py-2 ${column.align || 'text-left'}`}
            style={{ flex: column.width || 1 }}
          >
            {column.render ? column.render(item[column.key], item) : item[column.key]}
          </div>
        ))}
      </div>
    );
  });

  const Header = memo(() => (
    <div className="flex items-center bg-gray-50 border-b-2 border-gray-200 font-semibold">
      {onRowSelect && <div className="w-12"></div>}
      {columns.map((column) => (
        <div
          key={column.key}
          className={`flex-1 px-3 py-3 ${column.align || 'text-left'}`}
          style={{ flex: column.width || 1 }}
        >
          {column.label}
        </div>
      ))}
    </div>
  ));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex space-x-4">
          <div className="h-4 bg-gray-300 rounded w-32"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-4 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (!memoizedData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="text-4xl mb-4">📊</div>
        <div className="text-lg">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Header />
      <List
        height={height}
        itemCount={memoizedData.length}
        itemSize={itemHeight}
        itemData={memoizedData}
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;

// Predefined column configurations for common tables
export const invoiceColumns = [
  {
    key: 'invoiceNumber',
    label: 'Invoice #',
    width: 1.2,
    render: (value) => <span className="font-mono font-medium">{value}</span>
  },
  {
    key: 'customer',
    label: 'Customer',
    width: 2,
    render: (customer) => customer?.firmName || customer?.name || 'N/A'
  },
  {
    key: 'invoiceDate',
    label: 'Date',
    width: 1,
    render: (date) => new Date(date).toLocaleDateString()
  },
  {
    key: 'grandTotal',
    label: 'Amount',
    width: 1.2,
    align: 'text-right',
    render: (amount) => <span className="font-semibold">{formatCurrency(amount || 0)}</span>
  },
  {
    key: 'paymentStatus',
    label: 'Status',
    width: 1,
    render: (status, item) => {
      const balance = item.balance || 0;
      let statusText = status;
      let colorClass = 'bg-gray-100 text-gray-800';
      
      if (balance <= 0) {
        statusText = 'Paid';
        colorClass = 'bg-green-100 text-green-800';
      } else if (item.paidAmount > 0) {
        statusText = 'Partial';
        colorClass = 'bg-yellow-100 text-yellow-800';
      } else {
        statusText = 'Pending';
        colorClass = 'bg-red-100 text-red-800';
      }
      
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {statusText}
        </span>
      );
    }
  }
];

export const customerColumns = [
  {
    key: 'firmName',
    label: 'Company',
    width: 2,
    render: (value, item) => value || item.name || 'N/A'
  },
  {
    key: 'contact',
    label: 'Contact',
    width: 1.5,
    render: (value, item) => value || item.phone || 'N/A'
  },
  {
    key: 'email',
    label: 'Email',
    width: 2
  },
  {
    key: 'customerType',
    label: 'Type',
    width: 1,
    render: (type) => (
      <span className={`px-2 py-1 rounded text-xs ${
        type === 'B2B' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
      }`}>
        {type}
      </span>
    )
  },
  {
    key: 'state',
    label: 'State',
    width: 1.5
  }
];

export const itemColumns = [
  {
    key: 'name',
    label: 'Item Name',
    width: 2
  },
  {
    key: 'hsnCode',
    label: 'HSN Code',
    width: 1,
    render: (value) => <span className="font-mono">{value}</span>
  },
  {
    key: 'rate',
    label: 'Rate',
    width: 1,
    align: 'text-right',
    render: (value) => formatCurrency(value || 0)
  },
  {
    key: 'quantityInStock',
    label: 'Stock',
    width: 1,
    align: 'text-right',
    render: (value) => {
      const stock = value || 0;
      const colorClass = stock <= 10 ? 'text-red-600' : stock <= 50 ? 'text-yellow-600' : 'text-green-600';
      return <span className={colorClass}>{stock}</span>;
    }
  },
  {
    key: 'taxSlab',
    label: 'GST%',
    width: 0.8,
    align: 'text-center',
    render: (value) => `${value || 0}%`
  }
];
