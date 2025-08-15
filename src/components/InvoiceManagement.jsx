import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/dateHelpers';
import { billingAPI } from '../api/billing';
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

  useEffect(() => {
    fetchInvoices();
  }, [filters, sortBy, sortDir, page, pageSize]);

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

  const applyFiltersSortPaginate = (list) => {
    let data = list.slice();

    // Filters
    if (filters.status !== 'all') {
      data = data.filter((invoice) => invoice.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter((invoice) =>
        (invoice.invoiceNumber || '').toLowerCase().includes(q) ||
        (invoice.customer?.name || '').toLowerCase().includes(q)
      );
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      data = data.filter((invoice) => (invoice.date ? new Date(invoice.date) >= from : true));
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      data = data.filter((invoice) => (invoice.date ? new Date(invoice.date) <= to : true));
    }

    // Sorting
    data.sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'amount':
          av = a.total || 0; bv = b.total || 0;
          break;
        case 'customer':
          av = (a.customer?.name || '').toLowerCase();
          bv = (b.customer?.name || '').toLowerCase();
          break;
        case 'status':
          av = a.status || ''; bv = b.status || '';
          break;
        case 'date':
        default:
          av = a.date ? new Date(a.date).getTime() : 0;
          bv = b.date ? new Date(b.date).getTime() : 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalCount = data.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    return { data: pageData, totalCount };
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await billingAPI.getInvoices();
      const raw = Array.isArray(response) ? response : (response.invoices || []);
      const normalized = raw.map(normalizeInvoice);
      const { data, totalCount } = applyFiltersSortPaginate(normalized);
      setInvoices(data);
      // Optionally store totalCount for pagination UI
      // setTotalCount(totalCount);
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
      const response = await billingAPI.getInvoiceById(invoice._id);
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
    const message = `Hi ${invoice.customer?.name}, your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total)} is ready. You can view it here: ${window.location.origin}/invoice/${invoice._id}`;
    const whatsappUrl = `https://wa.me/${invoice.customer?.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleMarkAsPaid = async (invoice) => {
    try {
      // Fetch full invoice to satisfy backend update validation
      const full = await billingAPI.getInvoiceById(invoice._id);
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

      await billingAPI.updateInvoice(invoice._id, payload);
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
      const res = await portalAPI.createInvoicePortalLink(invoice._id);
      const url = res?.url;
      if (!url) throw new Error('No URL returned');
      await navigator.clipboard.writeText(url);
      toast.success('Portal link copied to clipboard');
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to create portal link');
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      try {
        await billingAPI.deleteInvoice(invoice._id);
        toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
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
            await Promise.all(selectedInvoices.map(id => billingAPI.deleteInvoice(id)));
            toast.success(`${selectedInvoices.length} invoices deleted`);
          }
          break;
        case 'markPaid':
          await Promise.all(selectedInvoices.map(id => 
            billingAPI.updateInvoice(id, { 
              status: 'paid',
              paidDate: new Date().toISOString()
            })
          ));
          toast.success(`${selectedInvoices.length} invoices marked as paid`);
          break;
        case 'markPending':
          await Promise.all(selectedInvoices.map(id => 
            billingAPI.updateInvoice(id, { status: 'pending' })
          ));
          toast.success(`${selectedInvoices.length} invoices marked as pending`);
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
          <p className="text-2xl font-bold text-blue-900">{invoices.length}</p>
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
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
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
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                    <div className="flex items-center space-x-2">
                      {/* Edit */}
                      <a
                        href={`/edit-invoice/${invoice._id}`}
                        className="text-gray-700 hover:text-gray-900"
                        title="Edit Invoice"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m2 0h2m-4 4h2m2 0h2M7 3h2m-2 0H5m2 4H5m0 0H3m9 4l6-6a2.121 2.121 0 013 3l-6 6M7 17l4 0 8-8" />
                        </svg>
                      </a>

                      {/* Print */}
                      <button
                        onClick={() => handlePrintInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Print Invoice"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </button>
                      
                      {/* WhatsApp */}
                      <button
                        onClick={() => handleWhatsAppInvoice(invoice)}
                        className="text-green-600 hover:text-green-900"
                        title="Send via WhatsApp"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.382z"/>
                        </svg>
                      </button>

                      {/* Copy Portal Link */}
                      <button
                        onClick={() => handleCopyPortalLink(invoice)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Copy Portal Link"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 115.656 5.656l-1.5 1.5" />
                        </svg>
                      </button>
                      
                      {/* Mark as Paid */}
                      {invoice.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Paid"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Invoice"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
        <span className="text-sm">Page {page}</span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={invoices.length < pageSize}
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
