import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/dateHelpers';
import { billingAPI } from '../api/billing';
import { portalAPI } from '../api/portal';
import AdvancedInvoicePrint from './AdvancedInvoicePrint';

// Feature-based imports
import { useInvoices } from '../features/invoices/hooks/useInvoices';
import InvoiceSummaryCards from '../features/invoices/components/InvoiceSummaryCards';
import InvoiceFilters from '../features/invoices/components/InvoiceFilters';
import InvoiceTable from '../features/invoices/components/InvoiceTable';
import LoadingSpinner from '../features/shared/components/LoadingSpinner';
import ErrorState from '../features/shared/components/ErrorState';
import EmptyState from '../features/shared/components/EmptyState';

const InvoiceManagement = () => {
  const { invoices, loading, error, totalCount, fetchInvoices, deleteInvoice, markAsPaid } = useInvoices();
  
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
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
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
    const t = setTimeout(() => {
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
      fetchInvoices(params);
    }, 300);
    return () => clearTimeout(t);
  }, [filters, sortBy, sortDir, page, pageSize, searchInput, fetchInvoices]);

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

  const handleWhatsAppInvoice = (invoice) => {
    const appBase = (typeof window !== 'undefined') ? (window.__basename || import.meta.env.BASE_URL || '') : '';
    const prefix = appBase.replace(/\/$/, '');
    const invoiceUrl = `${prefix}/invoice/${invoice._id}`;
    const message = `Hi ${invoice.customer?.name}, your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total)} is ready. You can view it here: ${invoiceUrl}`;
    const whatsappUrl = `https://wa.me/${invoice.customer?.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyPortalLink = async (invoice) => {
    try {
      const res = await portalAPI.createInvoicePortalLink(invoice._id);
      const url = res?.url;
      if (!url) throw new Error('No URL returned');
      
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
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

  const handleMarkAsPaid = async (invoice) => {
    try {
      await markAsPaid(invoice);
      toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      try {
        await deleteInvoice(invoice._id);
        toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
      } catch (error) {
        if (error?.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
        } else if (error?.response?.status === 404) {
          toast('Invoice already removed');
        } else {
          toast.error(error?.response?.data?.message || 'Failed to delete invoice');
        }
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading invoices..." />;
  }

  if (error) {
    return <ErrorState title="Error Loading Invoices" message={error} onRetry={() => fetchInvoices()} />;
  }

  if (invoices.length === 0 && !loading) {
    const hasFilters = searchInput || filters.status !== 'all' || filters.dateFrom || filters.dateTo;
    return (
      <EmptyState
        title={hasFilters ? 'No invoices match your filters' : 'No invoices found'}
        description={hasFilters ? 'Try adjusting your search criteria or filters.' : 'Get started by creating your first invoice.'}
        actionButton={!hasFilters && (
          <Link to="/billing" className="btn-enhanced btn-primary">
            Create First Invoice
          </Link>
        )}
      />
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

      {/* Summary Cards */}
      <InvoiceSummaryCards invoices={invoices} totalCount={totalCount} />

      {/* Filters */}
      <InvoiceFilters
        filters={filters}
        setFilters={setFilters}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDir={sortDir}
        setSortDir={setSortDir}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setPage={setPage}
      />

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
              <button className="btn-enhanced bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      <InvoiceTable
        invoices={invoices}
        selectedInvoices={selectedInvoices}
        onSelectInvoice={handleSelectInvoice}
        onSelectAll={handleSelectAll}
        onPrint={handlePrintInvoice}
        onWhatsApp={handleWhatsAppInvoice}
        onCopyPortalLink={handleCopyPortalLink}
        onMarkAsPaid={handleMarkAsPaid}
        onDelete={handleDeleteInvoice}
        sortBy={sortBy}
        sortDir={sortDir}
        setSortBy={setSortBy}
        setSortDir={setSortDir}
        menuOpenId={menuOpenId}
        setMenuOpenId={setMenuOpenId}
        menuRef={menuRef}
      />

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