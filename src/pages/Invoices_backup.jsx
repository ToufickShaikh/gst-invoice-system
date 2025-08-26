import React, { useEffect, useState, useMemo } from 'react';
import { billingAPI } from '../api/billing';
import { getApiBaseUrl, getAppBasePath } from '../utils/appBase';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InvoiceFilters from '../components/InvoiceFilters';
import InvoiceTable from '../components/InvoiceTable';
import InvoiceActionBar from '../components/InvoiceActionBar';
import InvoiceAnalytics from '../components/InvoiceAnalytics';
import InvoiceSettings from '../components/InvoiceSettings';
import { formatCurrency } from '../utils/dateHelpers';
import { downloadInvoicePdf } from '../utils/downloadHelper';
import { tryMultipleDownloadMethods } from '../utils/alternativeDownload';
import { sendPaymentReminderViaWhatsApp } from '../utils/whatsappHelper';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Invoices = () => {
    const navigate = useNavigate();
    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('ALL');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrCodeImage, setQrCodeImage] = useState('');
    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const [viewMode, setViewMode] = useState('table');
    const [sortField, setSortField] = useState('invoiceDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        dateRange: 'all',
        customStartDate: '',
        customEndDate: '',
        amountMin: '',
        amountMax: '',
        customerType: 'all',
        paymentMethod: 'all'
    });

    // Filtered and sorted invoices
    const filteredInvoices = useMemo(() => {
        let filtered = [...allInvoices];

        // Apply tab filter first
        if (tab !== 'ALL') {
            filtered = filtered.filter(inv => inv.customer?.customerType === tab);
        }

        // Apply search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(inv =>
                inv.invoiceNumber?.toLowerCase().includes(searchTerm) ||
                inv.customer?.firmName?.toLowerCase().includes(searchTerm) ||
                inv.customer?.name?.toLowerCase().includes(searchTerm) ||
                inv.customer?.contact?.includes(searchTerm)
            );
        }

        // Apply status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(inv => {
                const total = inv.grandTotal || inv.totalAmount || 0;
                const paid = inv.paidAmount || 0;
                const balance = total - paid;

                switch (filters.status) {
                    case 'paid':
                        return balance <= 0;
                    case 'partial':
                        return balance > 0 && paid > 0;
                    case 'overdue':
                        const invoiceDate = new Date(inv.invoiceDate);
                        const dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
                        return balance > 0 && new Date() > dueDate;
                    case 'draft':
                        return inv.status === 'draft';
                    default:
                        return true;
                }
            });
        }

        // Apply date range filter
        if (filters.dateRange !== 'all') {
            const now = new Date();
            let startDate;

            switch (filters.dateRange) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'this_week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'this_month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'this_quarter':
                    const quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    break;
                case 'this_year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                case 'custom':
                    if (filters.customStartDate) {
                        startDate = new Date(filters.customStartDate);
                    }
                    break;
            }

            if (startDate) {
                filtered = filtered.filter(inv => new Date(inv.invoiceDate) >= startDate);
            }

            if (filters.dateRange === 'custom' && filters.customEndDate) {
                const endDate = new Date(filters.customEndDate);
                endDate.setHours(23, 59, 59, 999);
                filtered = filtered.filter(inv => new Date(inv.invoiceDate) <= endDate);
            }
        }

        // Apply amount filters
        if (filters.amountMin) {
            filtered = filtered.filter(inv => 
                (inv.grandTotal || inv.totalAmount || 0) >= parseFloat(filters.amountMin)
            );
        }
        if (filters.amountMax) {
            filtered = filtered.filter(inv => 
                (inv.grandTotal || inv.totalAmount || 0) <= parseFloat(filters.amountMax)
            );
        }

        // Apply customer type filter
        if (filters.customerType !== 'all') {
            filtered = filtered.filter(inv => inv.customer?.customerType === filters.customerType);
        }

        // Apply payment method filter
        if (filters.paymentMethod !== 'all') {
            filtered = filtered.filter(inv => inv.paymentMethod === filters.paymentMethod);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'invoiceNumber':
                    aValue = a.invoiceNumber || '';
                    bValue = b.invoiceNumber || '';
                    break;
                case 'customer':
                    aValue = a.customer?.firmName || a.customer?.name || '';
                    bValue = b.customer?.firmName || b.customer?.name || '';
                    break;
                case 'invoiceDate':
                    aValue = new Date(a.invoiceDate || 0);
                    bValue = new Date(b.invoiceDate || 0);
                    break;
                case 'grandTotal':
                    aValue = a.grandTotal || a.totalAmount || 0;
                    bValue = b.grandTotal || b.totalAmount || 0;
                    break;
                default:
                    aValue = a[sortField] || '';
                    bValue = b[sortField] || '';
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [allInvoices, tab, filters, sortField, sortDirection]);

    // Calculate analytics
    const analytics = useMemo(() => {
        const totalAmount = allInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0);
        return {
            totalInvoices: allInvoices.length,
            totalAmount,
            filteredCount: filteredInvoices.length
        };
    }, [allInvoices, filteredInvoices]);

    const fetchInvoices = async (billingType) => {
        setLoading(true);
        try {
            // Always fetch all invoices, then filter on frontend for better UX
            const res = await billingAPI.getInvoices();
            if (Array.isArray(res)) {
                setAllInvoices(res);
            } else if (Array.isArray(res?.data)) {
                setAllInvoices(res.data);
            } else {
                setAllInvoices([]);
            }
        } catch (e) {
            setAllInvoices([]);
            toast.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        setLoading(true);
        try {
            await billingAPI.deleteInvoice(id);
            setAllInvoices(allInvoices.filter(inv => inv._id !== id));
            toast.success('Invoice deleted successfully!');
        } catch (err) {
            toast.error('Failed to delete invoice.');
        } finally {
            setLoading(false);
        }
    };

    // Navigate to billing page for editing the invoice
    const handleEdit = (invoiceId) => {
        navigate(`/billing?edit=${invoiceId}`);
    };

    // Handle reprinting the invoice with automatic PDF download
    const handleReprint = async (invoiceId) => {
        // Confirm before reprinting
        if (!window.confirm('Are you sure you want to reprint this invoice?')) {
            return;
        }

        setLoading(true);
        try {
            console.log('🔄 Starting reprint process for invoice:', invoiceId);
            toast.loading('Generating invoice PDF...', { id: 'reprint-toast' });

            console.log('📡 Making API call to reprint invoice...');
            const res = await billingAPI.reprintInvoice(invoiceId);
            console.log('✅ API Response received:', res);

            if (res && res.pdfPath) {
                toast.dismiss('reprint-toast');
                toast.success('Invoice generated successfully!');
                console.log('📄 PDF Path received:', res.pdfPath);

                // Use the Nginx proxy URL for PDF serving
                const apiBase = getApiBaseUrl() || '';
                const baseUrl = apiBase ? apiBase.replace('/api', '') : (getAppBasePath() || '');
                console.log('🌐 Using base URL:', baseUrl);

                // Construct the PDF URL through Nginx proxy
                const normalizedPath = res.pdfPath.startsWith('/') ? res.pdfPath : `/${res.pdfPath}`;
                const pdfUrl = `${baseUrl}${normalizedPath}`;
                console.log('🔗 Final PDF URL:', pdfUrl);

                // Determine if it's a PDF or HTML file to set proper MIME type
                const isPdf = res.pdfPath.toLowerCase().endsWith('.pdf');
                const mimeType = isPdf ? 'application/pdf' : 'text/html';

                // Show different messages based on file type
                if (isPdf) {
                    toast.success('PDF invoice generated successfully! 📄', {
                        duration: 4000,
                        icon: '✅'
                    });
                } else {
                    toast.success('Invoice generated as HTML (PDF generation unavailable) 📄', {
                        duration: 5000,
                        icon: '⚠️'
                    });
                }

                // Extract filename
                let fileName = res.pdfPath.split('/').pop();
                if (!fileName) {
                    const extension = isPdf ? '.pdf' : '.html';
                    fileName = `invoice-${invoiceId}${extension}`;
                }
                console.log('📎 Filename:', fileName, 'Type:', mimeType);

                // Use direct window.open for simple and reliable download
                try {
                    console.log('🪟 Opening invoice in new tab...');
                    // Open the invoice in a new tab
                    const newWindow = window.open(pdfUrl, '_blank');

                    if (newWindow) {
                        console.log('✅ New window opened successfully');
                        const successMessage = isPdf ?
                            'PDF invoice opened in new tab! 📄' :
                            'HTML invoice opened in new tab! (Use browser\'s print to PDF for PDF version) 🖨️';

                        toast.success(successMessage, {
                            duration: 5000,
                            icon: '📥'
                        });
                    } else {
                        console.log('⚠️ Popup blocked, showing manual link');
                        throw new Error('Popup blocked');
                    }
                } catch (err) {
                    console.error('❌ Error opening PDF:', err);

                    // Fallback with manual link
                    toast.error(
                        <div>
                            <p>Could not open automatically. Click the link below to open manually:</p>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                Open {fileName}
                            </a>
                        </div>,
                        { duration: 10000 }
                    );
                }
            } else {
                console.error('❌ Invalid response from reprint API:', res);
                toast.dismiss('reprint-toast');
                toast.error(res?.message || 'Could not find PDF to reprint. Please try again.');
            }
        } catch (err) {
            console.error('❌ Reprint error:', err);
            toast.dismiss('reprint-toast');

            // Provide more specific error information
            if (err.response) {
                // Server responded with error status
                console.error('Server error response:', err.response.data);
                toast.error(`Server error: ${err.response.data?.message || err.response.statusText}`);
            } else if (err.request) {
                // Request was made but no response received
                console.error('No response received:', err.request);
                toast.error('No response from server. Please check your internet connection.');
            } else {
                // Something else happened
                console.error('Request setup error:', err.message);
                toast.error(`Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle WhatsApp reminder with improved messaging
    const handleWhatsAppReminder = (invoice) => {
        try {
            const result = sendPaymentReminderViaWhatsApp(
                invoice.customer,
                {
                    invoiceNumber: invoice.invoiceNumber,
                    grandTotal: invoice.grandTotal || invoice.totalAmount,
                    paidAmount: invoice.paidAmount || 0,
                    balance: (invoice.grandTotal || invoice.totalAmount) - (invoice.paidAmount || 0),
                    invoiceDate: invoice.invoiceDate
                }
            );

            if (result.success) {
                toast.success('WhatsApp reminder opened!', {
                    duration: 3000,
                    icon: '📱'
                });
            } else {
                toast.error(`Error: ${result.error}`);
            }
        } catch (error) {
            toast.error('Failed to open WhatsApp reminder');
        }
    };

    // Advanced filter handling
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
    };

    // Sorting
    const handleSortChange = (field, direction) => {
        setSortField(field);
        setSortDirection(direction);
    };

    // Export functions
    const handleExport = async (format) => {
        try {
            toast.loading('Preparing export...', { id: 'export-toast' });
            
            // Simulate export functionality
            switch (format) {
                case 'excel':
                    // Export to Excel logic
                    toast.success('Excel export completed!', { id: 'export-toast' });
                    break;
                case 'pdf':
                    // Export to PDF logic
                    toast.success('PDF export completed!', { id: 'export-toast' });
                    break;
                case 'csv':
                    // Export to CSV logic
                    const csvData = filteredInvoices.map(inv => ({
                        'Invoice Number': inv.invoiceNumber,
                        'Customer': inv.customer?.firmName || inv.customer?.name,
                        'Date': inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
                        'Total': inv.grandTotal || inv.totalAmount,
                        'Paid': inv.paidAmount || 0,
                        'Balance': (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0)
                    }));
                    
                    const csvContent = Object.keys(csvData[0] || {}).join(',') + '\n' +
                        csvData.map(row => Object.values(row).join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    toast.success('CSV export completed!', { id: 'export-toast' });
                    break;
                case 'print':
                    // Print logic
                    window.print();
                    toast.success('Print dialog opened!', { id: 'export-toast' });
                    break;
            }
        } catch (error) {
            toast.error('Export failed', { id: 'export-toast' });
        }
    };

    // Bulk actions
    const handleBulkAction = async (action) => {
        if (selectedInvoices.length === 0) {
            toast.error('Please select invoices first');
            return;
        }

        switch (action) {
            case 'delete':
                if (window.confirm(`Delete ${selectedInvoices.length} selected invoices?`)) {
                    setLoading(true);
                    try {
                        for (const invoiceId of selectedInvoices) {
                            await billingAPI.deleteInvoice(invoiceId);
                        }
                        setAllInvoices(allInvoices.filter(inv => !selectedInvoices.includes(inv._id)));
                        setSelectedInvoices([]);
                        toast.success(`${selectedInvoices.length} invoices deleted successfully!`);
                    } catch (error) {
                        toast.error('Failed to delete some invoices');
                    } finally {
                        setLoading(false);
                    }
                }
                break;
            case 'reprint':
                setLoading(true);
                try {
                    for (const invoiceId of selectedInvoices) {
                        await handleReprint(invoiceId);
                    }
                    toast.success(`${selectedInvoices.length} invoices reprinted!`);
                } catch (error) {
                    toast.error('Failed to reprint some invoices');
                } finally {
                    setLoading(false);
                }
                break;
            case 'clear-selection':
                setSelectedInvoices([]);
                break;
        }
    };

    // Handle generating and showing the payment QR code
    const handlePay = async (invoice) => {
        const balance = (invoice.grandTotal || 0) - (invoice.paidAmount || 0);
        if (balance <= 0) {
            toast.error('This invoice is already paid in full.');
            return;
        }

        setLoading(true);
        try {
            const res = await billingAPI.generatePaymentQr(invoice._id);
            if (res.qrCodeImage) {
                setQrCodeImage(res.qrCodeImage);
                setIsQrModalOpen(true);
            } else {
                toast.error('Could not generate QR code.');
            }
        } catch (err) {
            toast.error('Failed to generate QR code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
                        <p className="text-gray-600 mt-1">Manage and track all your invoices in one place</p>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                <InvoiceAnalytics invoices={allInvoices} />

                {/* Action Bar */}
                <InvoiceActionBar
                    selectedCount={selectedInvoices.length}
                    totalInvoices={analytics.totalInvoices}
                    onExport={handleExport}
                    onBulkAction={handleBulkAction}
                    onCreateNew={() => navigate('/billing')}
                    onImport={() => toast.info('Import feature coming soon!')}
                    onSettings={() => setIsSettingsOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                {/* Filters */}
                <InvoiceFilters
                    onFilterChange={handleFilterChange}
                    totalInvoices={analytics.totalInvoices}
                    totalAmount={analytics.totalAmount}
                    filteredCount={analytics.filteredCount}
                />

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex">
                            {['ALL', 'B2B', 'B2C'].map((tabName) => (
                                <button
                                    key={tabName}
                                    onClick={() => setTab(tabName)}
                                    className={`py-4 px-6 border-b-2 font-medium text-sm ${
                                        tab === tabName
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {tabName} {tabName !== 'ALL' && 'Invoices'}
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {tabName === 'ALL' 
                                            ? allInvoices.length
                                            : allInvoices.filter(inv => inv.customer?.customerType === tabName).length
                                        }
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Invoice Table */}
                    <InvoiceTable
                        invoices={filteredInvoices}
                        loading={loading}
                        onEdit={handleEdit}
                        onReprint={handleReprint}
                        onPay={handlePay}
                        onDelete={handleDelete}
                        onWhatsAppReminder={handleWhatsAppReminder}
                        onSortChange={handleSortChange}
                        sortField={sortField}
                        sortDirection={sortDirection}
                    />
                </div>
            </div>

            {/* QR Code Modal */}
            <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Scan to Pay">
                {qrCodeImage && (
                    <div className="flex flex-col items-center p-6">
                        <img src={qrCodeImage} alt="UPI QR Code" className="rounded-lg shadow-lg" />
                        <p className="mt-4 text-center text-sm text-gray-600">
                            Scan this code with any UPI app to pay the balance amount.
                        </p>
                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Download QR code
                                    const link = document.createElement('a');
                                    link.href = qrCodeImage;
                                    link.download = 'payment-qr-code.png';
                                    link.click();
                                }}
                            >
                                Download QR
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsQrModalOpen(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Settings Modal */}
            <InvoiceSettings 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
            />
        </Layout>
    );
};
export default Invoices;
