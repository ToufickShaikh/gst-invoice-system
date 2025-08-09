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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
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
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Edited
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.customer ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.customer.firmName || invoice.customer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.customer.customerType} • {invoice.customer.contact}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">
                        No Customer
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.grandTotal || invoice.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invoice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {balance > 0 ? formatCurrency(balance) : balance < 0 ? `+${formatCurrency(Math.abs(balance))}` : 'Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(invoice._id)}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReprint(invoice._id)}
                          className="text-gray-600 hover:text-green-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </Button>

                        {balance > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => onPay(invoice)}
                              className="text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </Button>

                            {invoice.customer?.contact && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onWhatsAppReminder(invoice)}
                                className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                </svg>
                              </Button>
                            )}
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onDelete(invoice._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
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
