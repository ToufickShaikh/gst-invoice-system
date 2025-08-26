import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/dateHelpers';
import { billingAPI } from '../api/billing'; // retains legacy (GST, payment QR)
import { invoicesAPI } from '../api/invoices';
import AdvancedInvoicePrint from './AdvancedInvoicePrint';
import { portalAPI } from '../api/portal';

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date | amount | customer | status
  const [sortDir, setSortDir] = useState('desc'); // asc | desc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Debounced fetch when filters/search/sort/page change
  useEffect(() => {
    const t = setTimeout(() => fetchInvoices(), 300);
    return () => clearTimeout(t);
  }, [filters, sortBy, sortDir, page, pageSize, searchInput]);

  const normalizeInvoice = (inv) => {
    const customerName = inv.customer?.firmName || inv.customer?.name || '';
    const customerPhone = inv.customer?.contact || inv.customer?.phone || '';
    const invoiceDate = inv.invoiceDate || inv.createdAt || inv.date || null;
    const dueDate = inv.dueDate || invoiceDate || null;
    const total = Number(inv.grandTotal ?? inv.totalAmount ?? inv.total ?? 0);
    const paid = Number(inv.paidAmount ?? 0);
    const balance = Number(inv.balance != null ? inv.balance : (total - paid));

    let status = 'pending';
    if (balance <= 0 && total > 0) status = 'paid';
    else if (paid > 0 && balance > 0) status = 'partial';
    const isOverdue = dueDate ? new Date(dueDate) < new Date() && balance > 0 : false;
    if (isOverdue) status = 'overdue';

    return {
      ...inv,
      customer: { ...(inv.customer || {}), name: customerName, phone: customerPhone },
      date: invoiceDate,
      dueDate,
      total,
      paidAmount: paid,
      balance,
      status,
    };
  };

  // client-side normalize only; server will handle filtering/paging when available

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status === 'all' ? undefined : filters.status,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: searchInput || undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      };
      const response = await invoicesAPI.list(params);
      // response expected shape: { data: [], totalCount }
      const raw = response?.data || response || [];
      const normalized = Array.isArray(raw) ? raw.map(normalizeInvoice) : (raw.invoices || []).map(normalizeInvoice);
      setInvoices(normalized);
      setTotalCount(response?.totalCount ?? (Array.isArray(response) ? response.length : normalized.length));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(invoice => invoice._id));
    }
  };

  const handlePrintInvoice = async (invoice) => {
    try {
  const response = await invoicesAPI.get(invoice._id);
      setCurrentInvoice(response); // API returns invoice object directly
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const handleEmailInvoice = async (invoice) => {
    try {
      await billingAPI.emailInvoice(invoice._id);
      toast.success(`Invoice ${invoice.invoiceNumber} sent via email`);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    }
  };

  const handleWhatsAppInvoice = (invoice) => {
    const appBase = (typeof window !== 'undefined') ? (window.__basename || import.meta.env.BASE_URL || '') : '';
    const prefix = appBase.replace(/\/$/, '');
    const invoiceUrl = `${prefix}/invoice/${invoice._id}`;
    const message = `Hi ${invoice.customer?.name}, your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total)} is ready. You can view it here: ${invoiceUrl}`;
    const whatsappUrl = `https://wa.me/${invoice.customer?.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleMarkAsPaid = async (invoice) => {
    try {
      // Fetch full invoice to satisfy backend update validation
  const full = await invoicesAPI.get(invoice._id);
      if (!full) throw new Error('Invoice not found');

      // Build items payload compatible with backend normalizer
      const itemsPayload = (full.items || []).map((li) => ({
        item: li.item?._id || (typeof li.item === 'string' ? li.item : undefined),
        name: li.name || li.item?.name || '',
        quantity: Number(li.quantity || 0),
        rate: li.rate ?? li.price ?? li.item?.price ?? 0,
        taxSlab: li.taxSlab ?? li.item?.taxSlab ?? 0,
        hsnCode: li.hsnCode || li.item?.hsnCode || '',
      }));

      const payload = {
        customer: full.customer?._id || full.customer,
        items: itemsPayload,
        discount: full.discount || 0,
        shippingCharges: full.shippingCharges || 0,
        paidAmount: Number(full.grandTotal ?? full.totalAmount ?? 0), // mark fully paid
        paymentMethod: full.paymentMethod || 'Cash',
        billingType: full.billingType || '',
      };

  await invoicesAPI.update(invoice._id, payload);
      toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error(error?.response?.data?.message || 'Failed to update invoice');
    }
  };

  // Create/copy secure customer portal link for an invoice
  const handleCopyPortalLink = async (invoice) => {
    try {
  const res = await portalAPI.createInvoicePortalLink(invoice._id); // already v2 under the hood
      const url = res?.url;
      if (!url) throw new Error('No URL returned');
      // Use navigator.clipboard when available, otherwise fallback to a temporary textarea
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        // prevent scrolling to bottom
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
        } catch (execErr) {
          console.error('Fallback copy failed', execErr);
          throw execErr;
        } finally {
          document.body.removeChild(ta);
        }
      }
      toast.success('Portal link copied to clipboard');
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to create portal link');
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      try {
        // Optimistic UI update: remove immediately
        setInvoices(prev => prev.filter(inv => inv._id !== invoice._id));
  const res = await invoicesAPI.remove(invoice._id);
        if (!res?.success) {
          // Re-fetch if backend did not confirm
            await fetchInvoices();
        }
        toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
      } catch (error) {
        console.error('Error deleting invoice:', error);
        if (error?.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
        } else if (error?.response?.status === 404) {
          toast('Invoice already removed');
          fetchInvoices();
        } else {
          toast.error(error?.response?.data?.message || 'Failed to delete invoice');
          // Rollback optimistic removal on hard failure
          fetchInvoices();
        }
      }
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedInvoices.length === 0) {
      toast.error('Please select invoices and an action');
      return;
    }

    try {
      switch (bulkAction) {
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedInvoices.length} invoices?`)) {
            await Promise.all(selectedInvoices.map(id => invoicesAPI.remove(id)));
            toast.success(`${selectedInvoices.length} invoices deleted`);
          }
          break;
        case 'markPaid':
          toast.error('Mark paid bulk action not implemented in v2 (set paidAmount individually).');
          break;
        case 'markPending':
          toast.error('Mark pending bulk action not implemented in v2.');
          break;
        case 'export':
          await exportInvoices(selectedInvoices);
          break;
        default:
          toast.error('Invalid action');
          return;
      }
      
      setSelectedInvoices([]);
      setBulkAction('');
      fetchInvoices();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const exportInvoices = async (invoiceIds) => {
    try {
      const invoiceData = invoices.filter(invoice => invoiceIds.includes(invoice._id));
      
      // Create CSV content
      const csvContent = [
        ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Status', 'Amount', 'Paid Amount'],
        ...invoiceData.map(invoice => [
          invoice.invoiceNumber,
          invoice.customer?.name || '',
          new Date(invoice.date).toLocaleDateString(),
          new Date(invoice.dueDate).toLocaleDateString(),
          invoice.status,
          invoice.total,
          invoice.paidAmount || 0
        ])
      ].map(row => row.join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoices exported successfully');
    } catch (error) {
      console.error('Error exporting invoices:', error);
      toast.error('Failed to export invoices');
    }
  };

  const getOverdueAmount = () => {
    return invoices
      .filter(invoice => invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + (invoice.total - (invoice.paidAmount || 0)), 0);
  };

  const getTotalAmount = () => {
    return invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  };

  const getPaidAmount = () => {
    return invoices.reduce((sum, invoice) => sum + (Number(invoice.paidAmount) || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Management</h1>
        <p className="text-gray-600">Manage all your invoices with advanced features</p>
      </div>

      {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-blue-600">Total Invoices</h3>
      <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-green-600">Total Amount</h3>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(getTotalAmount())}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-600">Paid Amount</h3>
          <p className="text-2xl font-bold text-yellow-900">{formatCurrency(getPaidAmount())}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-red-600">Overdue Amount</h3>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(getOverdueAmount())}</p>
        </div>
      </div>

  {/* Filters + Sort */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setPage(1); setSearchInput(e.target.value); }}
              placeholder="Invoice number or customer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => { setPage(1); setSortBy(e.target.value); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="customer">Customer</option>
                <option value="status">Status</option>
              </select>
              <select
                value={sortDir}
                onChange={(e) => { setPage(1); setSortDir(e.target.value); }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Per Page</label>
            <select
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

  {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedInvoices.length} invoice(s) selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Action</option>
                <option value="markPaid">Mark as Paid</option>
                <option value="markPending">Mark as Pending</option>
                <option value="export">Export Selected</option>
                <option value="delete">Delete Selected</option>
              </select>
              <button
                onClick={handleBulkAction}
                className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

  {/* Invoice Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="table-mobile-wrapper">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="text-left" onClick={() => { setSortBy('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>{'Invoice'}</button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="text-left" onClick={() => { setSortBy('customer'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>{'Customer'}</button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="text-left" onClick={() => { setSortBy('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>{'Date'}</button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="text-left" onClick={() => { setSortBy('amount'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>{'Amount'}</button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button className="text-left" onClick={() => { setSortBy('status'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>{'Status'}</button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice._id)}
                      onChange={() => handleSelectInvoice(invoice._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{invoice.customer?.name}</div>
                    <div className="text-sm text-gray-500">{invoice.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative inline-block text-left">
                      <button onClick={() => setMenuOpenId(menuOpenId === invoice._id ? null : invoice._id)} className="px-2 py-1 border rounded bg-white hover:bg-gray-50" title="Actions">•••</button>
                      {menuOpenId === invoice._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                          <div className="py-1">
                            <Link to={`/edit-invoice/${invoice._id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Edit</Link>
                            <button onClick={() => { setMenuOpenId(null); handlePrintInvoice(invoice); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Print</button>
                            <button onClick={() => { setMenuOpenId(null); handleWhatsAppInvoice(invoice); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">WhatsApp</button>
                            <button onClick={() => { setMenuOpenId(null); handleCopyPortalLink(invoice); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Copy Portal Link</button>
                            {invoice.status !== 'paid' && <button onClick={() => { setMenuOpenId(null); handleMarkAsPaid(invoice); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark as Paid</button>}
                            <button onClick={() => { setMenuOpenId(null); handleDeleteInvoice(invoice); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Delete</button>
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

        {invoices.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span className="text-sm">Page {page} of {Math.max(1, Math.ceil((totalCount || 0) / pageSize))}</span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={page * pageSize >= (totalCount || 0)}
        >
          Next
        </button>
      </div>

      {/* Print Modal */}
      {showPrintModal && currentInvoice && (
        <AdvancedInvoicePrint
          invoice={currentInvoice}
          isVisible={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setCurrentInvoice(null);
          }}
        />
      )}
    </div>
  );
};

export default InvoiceManagement;
