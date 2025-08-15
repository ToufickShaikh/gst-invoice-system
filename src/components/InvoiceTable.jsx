import React, { useState } from 'react';
import { formatCurrency } from '../utils/dateHelpers';
import Button from './Button';

const InvoiceTable = ({ 
  invoices, 
  loading, 
  onEdit, 
  onReprint, 
  onPay, 
  onDelete,
  onWhatsAppReminder,
  onSortChange,
  sortField,
  sortDirection 
}) => {
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedInvoices(invoices.map(inv => inv._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId, checked) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const getInvoiceStatus = (invoice) => {
    const total = invoice.grandTotal || invoice.totalAmount || 0;
    const paid = invoice.paidAmount || 0;
    const balance = total - paid;

    if (balance <= 0) return { status: 'paid', label: 'Paid', color: 'green' };
    if (paid > 0) return { status: 'partial', label: 'Partial', color: 'yellow' };
    
    // Check if overdue (assuming 30 days payment term)
    const invoiceDate = new Date(invoice.invoiceDate);
    const dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const isOverdue = new Date() > dueDate;
    
    if (isOverdue) return { status: 'overdue', label: 'Overdue', color: 'red' };
    return { status: 'pending', label: 'Pending', color: 'blue' };
  };

  const getStatusBadge = (invoice) => {
    const { label, color } = getInvoiceStatus(invoice);
    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
        {label}
      </span>
    );
  };

  const handleSort = (field) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newDirection);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const handleBulkAction = async (action) => {
    // Implement bulk actions
    switch (action) {
      case 'delete':
        if (window.confirm(`Delete ${selectedInvoices.length} selected invoices?`)) {
          for (const invoiceId of selectedInvoices) {
            await onDelete(invoiceId);
          }
          setSelectedInvoices([]);
        }
        break;
      case 'reprint':
        for (const invoiceId of selectedInvoices) {
          await onReprint(invoiceId);
        }
        setSelectedInvoices([]);
        break;
      // Add more bulk actions as needed
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first invoice.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('reprint')}
              >
                Bulk Reprint
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleBulkAction('delete')}
              >
                Bulk Delete
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedInvoices([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="table-mobile-wrapper">
        <table className="table-enhanced divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="flex items-center gap-1 hover:text-gray-700"
                  onClick={() => handleSort('invoiceNumber')}
                >
                  Invoice #
                  {getSortIcon('invoiceNumber')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="flex items-center gap-1 hover:text-gray-700"
                  onClick={() => handleSort('customer')}
                >
                  Customer
                  {getSortIcon('customer')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="flex items-center gap-1 hover:text-gray-700"
                  onClick={() => handleSort('invoiceDate')}
                >
                  Date
                  {getSortIcon('invoiceDate')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  className="flex items-center gap-1 hover:text-gray-700"
                  onClick={() => handleSort('grandTotal')}
                >
                  Total
                  {getSortIcon('grandTotal')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => {
              const balance = (invoice.grandTotal || invoice.totalAmount || 0) - (invoice.paidAmount || 0);
              const isSelected = selectedInvoices.includes(invoice._id);
              
              return (
                <tr 
                  key={invoice._id} 
                  className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${!invoice.customer ? 'bg-yellow-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      onChange={(e) => handleSelectInvoice(invoice._id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      {invoice.hasBeenEdited && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Edited
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invoice.customer?.firmName || invoice.customer?.name || '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {invoice.customer?.gstNo ? `GST: ${invoice.customer.gstNo}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.grandTotal || invoice.totalAmount || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invoice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {formatCurrency(balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="xs" variant="secondary" onClick={() => onEdit(invoice)}>
                        Edit
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => onReprint(invoice._id)}>
                        Reprint
                      </Button>
                      <Button size="xs" variant="success" onClick={() => onPay(invoice)}>
                        Record Payment
                      </Button>
                      <Button size="xs" variant="danger" onClick={() => onDelete(invoice._id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
