import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/dateHelpers';

const InvoiceTable = ({ 
  invoices, 
  selectedInvoices, 
  onSelectInvoice, 
  onSelectAll, 
  onPrint, 
  onWhatsApp, 
  onCopyPortalLink, 
  onMarkAsPaid, 
  onDelete,
  sortBy,
  sortDir,
  setSortBy,
  setSortDir,
  menuOpenId,
  setMenuOpenId,
  menuRef
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field) => {
    setSortBy(field);
    setSortDir(sortBy === field && sortDir === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="card-enhanced">
      {/* Desktop Table View */}
      <div className="hidden lg:block table-mobile-wrapper">
        <table className="table-enhanced">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 touch-target"
                />
              </th>
              <th>
                <button className="text-left hover:text-blue-600" onClick={() => handleSort('date')}>
                  Invoice {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th>
                <button className="text-left hover:text-blue-600" onClick={() => handleSort('customer')}>
                  Customer {sortBy === 'customer' && (sortDir === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th>
                <button className="text-left hover:text-blue-600" onClick={() => handleSort('date')}>
                  Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th>Due Date</th>
              <th>
                <button className="text-left hover:text-blue-600" onClick={() => handleSort('amount')}>
                  Amount {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th>
                <button className="text-left hover:text-blue-600" onClick={() => handleSort('status')}>
                  Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="hover:bg-gray-50">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedInvoices.includes(invoice._id)}
                    onChange={() => onSelectInvoice(invoice._id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 touch-target"
                  />
                </td>
                <td>
                  <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                </td>
                <td>
                  <div className="text-gray-900">{invoice.customer?.name}</div>
                  <div className="text-sm text-gray-500">{invoice.customer?.phone}</div>
                </td>
                <td className="text-gray-900">
                  {new Date(invoice.date).toLocaleDateString()}
                </td>
                <td className="text-gray-900">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </td>
                <td className="font-medium text-gray-900">
                  {formatCurrency(invoice.total)}
                </td>
                <td>
                  <span className={`status-badge-mobile ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  <div className="relative" ref={menuOpenId === invoice._id ? menuRef : null}>
                    <button 
                      onClick={() => setMenuOpenId(menuOpenId === invoice._id ? null : invoice._id)} 
                      className="touch-target px-2 py-1 border rounded bg-white hover:bg-gray-50 transition-colors" 
                      title="Actions"
                    >
                      •••
                    </button>
                    {menuOpenId === invoice._id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-20 animate-fade-in">
                        <div className="py-1">
                          <Link to={`/edit-invoice/${invoice._id}`} className="dropdown-item-mobile text-sm text-gray-700">Edit</Link>
                          <button onClick={() => { setMenuOpenId(null); onPrint(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">Print</button>
                          <button onClick={() => { setMenuOpenId(null); onWhatsApp(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">WhatsApp</button>
                          <button onClick={() => { setMenuOpenId(null); onCopyPortalLink(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">Copy Portal Link</button>
                          {invoice.status !== 'paid' && <button onClick={() => { setMenuOpenId(null); onMarkAsPaid(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">Mark as Paid</button>}
                          <button onClick={() => { setMenuOpenId(null); onDelete(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-red-600">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {invoices.map((invoice) => (
          <div key={invoice._id} className="invoice-item-mobile">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedInvoices.includes(invoice._id)}
                  onChange={() => onSelectInvoice(invoice._id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 touch-target"
                />
                <div>
                  <div className="font-semibold text-gray-900">{invoice.invoiceNumber}</div>
                  <div className="text-sm text-gray-600">{invoice.customer?.name}</div>
                </div>
              </div>
              <span className={`status-badge-mobile ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="text-gray-500">Date:</span>
                <div className="font-medium">{new Date(invoice.date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Due:</span>
                <div className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-gray-500">Amount:</span>
                <div className="font-bold text-lg">{formatCurrency(invoice.total)}</div>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <div className="font-medium">{invoice.customer?.phone}</div>
              </div>
            </div>

            <div className="mobile-actions">
              <Link to={`/edit-invoice/${invoice._id}`} className="btn-enhanced btn-secondary">
                ✏️ Edit
              </Link>
              <button onClick={() => onPrint(invoice)} className="btn-enhanced btn-secondary">
                🖨️ Print
              </button>
              <button onClick={() => onWhatsApp(invoice)} className="btn-enhanced bg-green-600 text-white hover:bg-green-700">
                📱 WhatsApp
              </button>
              <button onClick={() => onCopyPortalLink(invoice)} className="btn-enhanced btn-secondary">
                🔗 Portal
              </button>
              {invoice.status !== 'paid' && (
                <button onClick={() => onMarkAsPaid(invoice)} className="btn-enhanced btn-success">
                  ✅ Mark Paid
                </button>
              )}
              <button onClick={() => onDelete(invoice)} className="btn-enhanced btn-danger">
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceTable;