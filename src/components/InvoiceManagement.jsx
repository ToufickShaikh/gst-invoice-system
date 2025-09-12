import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const [error, setError] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };

    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpenId]);

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
      setError(null);
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
      setError('Failed to load invoices. Please try again.');
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
      const fullInvoice = await invoicesAPI.get(invoice._id);
      if (fullInvoice) {
        setCurrentInvoice(fullInvoice);
        setShowPrintModal(true);
      } else {
        toast.error('Could not load invoice details.');
      }
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

  const getDiscountGiven = () => {
    return invoices.reduce((sum, invoice) => {
      // prefer explicit invoice-level discount (absolute)
      if (invoice.discount != null && invoice.discount !== '') return sum + Number(invoice.discount || 0);
      // fallback: sum per-item discounts if present (items may have discountPct or discountAmount)
      if (Array.isArray(invoice.items) && invoice.items.length) {
        const lineDiscount = invoice.items.reduce((ls, it) => {
          // if stored as amount
          if (it.discountAmount != null) return ls + Number(it.discountAmount || 0);
          // if stored as percent, compute approx using rate*qty
          const rate = Number(it.rate || 0); const qty = Number(it.quantity || 0); const pct = Number(it.discount || 0);
          return ls + ((rate * qty) * (pct || 0) / 100);
        }, 0);
        return sum + lineDiscount;
      }
      return sum;
    }, 0);
  };

  if (loading) {
    return (
      <div className="loading-mobile">
        <div className="loading-spinner-mobile"></div>
        <p className="text-sm text-gray-600 mt-2">Loading invoices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-enhanced">
        <div className="empty-state-mobile">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Invoices</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => fetchInvoices()} 
            className="btn-enhanced btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (invoices.length === 0 && !loading) {
    return (
      <div className="card-enhanced">
        <div className="empty-state-mobile">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchInput || filters.status !== 'all' || filters.dateFrom || filters.dateTo 
              ? 'No invoices match your filters' 
              : 'No invoices found'
            }
          </h3>
          <p className="text-gray-500 mb-4">
            {searchInput || filters.status !== 'all' || filters.dateFrom || filters.dateTo 
              ? 'Try adjusting your search criteria or filters.' 
              : 'Get started by creating your first invoice.'
            }
          </p>
          {!(searchInput || filters.status !== 'all' || filters.dateFrom || filters.dateTo) && (
            <Link to="/billing" className="btn-enhanced btn-primary">
              Create First Invoice
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Invoice Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage all your invoices with advanced features</p>
        </div>
        <Link to="/billing" className="btn-enhanced btn-primary touch-target">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Invoice
        </Link>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-600 mb-1">Total Invoices</h3>
              <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-600 mb-1">Total Amount</h3>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(getTotalAmount())}</p>
            </div>
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-600 mb-1">Paid Amount</h3>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(getPaidAmount())}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-600 mb-1">Discount Given</h3>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(getDiscountGiven())}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-1">Overdue Amount</h3>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(getOverdueAmount())}</p>
            </div>
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
          <button
            onClick={() => {
              setFilters({ status: 'all', dateFrom: '', dateTo: '', search: '' });
              setSearchInput('');
              setPage(1);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => { setPage(1); setSearchInput(e.target.value); }}
                placeholder="Invoice number or customer..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setPage(1); setSortBy(e.target.value); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="customer">Customer</option>
              <option value="status">Status</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
            <select
              value={sortDir}
              onChange={(e) => { setPage(1); setSortDir(e.target.value); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Items Per Page</label>
            <select
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-blue-800 font-medium text-center sm:text-left">
              {selectedInvoices.length} invoice(s) selected
            </span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="select-mobile border-blue-300 focus:ring-blue-500"
              >
                <option value="">Select Action</option>
                <option value="markPaid">Mark as Paid</option>
                <option value="markPending">Mark as Pending</option>
                <option value="export">Export Selected</option>
                <option value="delete">Delete Selected</option>
              </select>
              <button
                onClick={handleBulkAction}
                className="btn-enhanced bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List - Mobile First Design */}
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
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 touch-target"
                  />
                </th>
                <th>
                  <button className="text-left hover:text-blue-600" onClick={() => { setSortBy('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    Invoice {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>
                  <button className="text-left hover:text-blue-600" onClick={() => { setSortBy('customer'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    Customer {sortBy === 'customer' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>
                  <button className="text-left hover:text-blue-600" onClick={() => { setSortBy('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>Due Date</th>
                <th>
                  <button className="text-left hover:text-blue-600" onClick={() => { setSortBy('amount'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
                    Amount {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th>
                  <button className="text-left hover:text-blue-600" onClick={() => { setSortBy('status'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); }}>
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
                      onChange={() => handleSelectInvoice(invoice._id)}
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
                            <button onClick={() => { setMenuOpenId(null); handlePrintInvoice(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">Print</button>
                            <button onClick={() => { setMenuOpenId(null); handleWhatsAppInvoice(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">WhatsApp</button>
                            <button onClick={() => { setMenuOpenId(null); handleCopyPortalLink(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">Copy Portal Link</button>
                            {invoice.status !== 'paid' && <button onClick={() => { setMenuOpenId(null); handleMarkAsPaid(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-gray-700">Mark as Paid</button>}
                            <button onClick={() => { setMenuOpenId(null); handleDeleteInvoice(invoice); }} className="dropdown-item-mobile w-full text-left text-sm text-red-600">Delete</button>
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
                    onChange={() => handleSelectInvoice(invoice._id)}
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
                <button onClick={() => handlePrintInvoice(invoice)} className="btn-enhanced btn-secondary">
                  🖨️ Print
                </button>
                <button onClick={() => handleWhatsAppInvoice(invoice)} className="btn-enhanced bg-green-600 text-white hover:bg-green-700">
                  📱 WhatsApp
                </button>
                <button onClick={() => handleCopyPortalLink(invoice)} className="btn-enhanced btn-secondary">
                  🔗 Portal
                </button>
                {invoice.status !== 'paid' && (
                  <button onClick={() => handleMarkAsPaid(invoice)} className="btn-enhanced btn-success">
                    ✅ Mark Paid
                  </button>
                )}
                <button onClick={() => handleDeleteInvoice(invoice)} className="btn-enhanced btn-danger">
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount} invoices
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-enhanced btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span className="text-sm px-3 py-2 bg-gray-100 rounded-md">
            {page} of {Math.max(1, Math.ceil((totalCount || 0) / pageSize))}
          </span>
          <button
            className="btn-enhanced btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * pageSize >= (totalCount || 0)}
          >
            Next →
          </button>
        </div>
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
