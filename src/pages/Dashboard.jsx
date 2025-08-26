// Complete Single-Page Business Dashboard - All Information in One View
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Card from '../components/Card';
import Button from '../components/Button';
import { billingAPI } from '../api/billing';
import { invoicesAPI } from '../api/invoices';
import { getApiBaseUrl } from '../utils/appBase';
import { formatCurrency } from '../utils/dateHelpers';
import Layout from '../components/Layout';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    balanceDue: 0,
    totalPaid: 0,
    totalInvoices: 0,
    totalCustomers: 0,
  });
  const [dateRange, setDateRange] = useState(() => {
    // Start with current month by default
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [gstReportLoading, setGstReportLoading] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchStats = async (showToast = true) => {
    setLoading(true);
    setError(null);

    try {
      // Prepare date range for API call - only send non-empty dates
      const apiDateRange = {};
      if (dateRange.startDate) apiDateRange.startDate = dateRange.startDate;
      if (dateRange.endDate) apiDateRange.endDate = dateRange.endDate;

      const data = await billingAPI.getDashboardStats(apiDateRange);

      // Validate that we received valid data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data received from server');
      }

      // Ensure all values are properly converted to numbers
      const processedStats = {
        totalRevenue: Number(data.totalRevenue) || 0,
        balanceDue: Number(data.balanceDue) || 0,
        totalPaid: Number(data.totalPaid) || 0,
        totalInvoices: Number(data.totalInvoices) || 0,
        totalCustomers: Number(data.totalCustomers) || 0,
      };

      setStats(processedStats);
      setLastUpdated(new Date());

      if (showToast) {
        toast.success('Dashboard updated successfully');
      }

    } catch (error) {
      console.error('Dashboard: Error fetching stats:', error);
      setError(error.message || 'Failed to fetch dashboard data');

      if (showToast) {
        toast.error('Failed to fetch dashboard stats. Please try again later.');
      }

      // Set default values on error
      setStats({
        totalRevenue: 0,
        balanceDue: 0,
        totalPaid: 0,
        totalInvoices: 0,
        totalCustomers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
  const invoices = await invoicesAPI.list();
      const recentInvoices = invoices
        .sort((a, b) => new Date(b.createdAt || b.invoiceDate) - new Date(a.createdAt || a.invoiceDate))
        .slice(0, 5)
        .map((invoice, index) => ({
          id: invoice._id || index,
          action: 'Invoice Generated',
          description: `${invoice.invoiceNumber} - ${formatCurrency(invoice.grandTotal)}`,
          time: formatTimeAgo(new Date(invoice.createdAt || invoice.invoiceDate)),
          type: 'invoice'
        }));

      setRecentActivity(recentInvoices);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // Fetch all data for complete dashboard view
  const fetchAllData = async () => {
    try {
      // Fetch all invoices
  const invoicesData = await invoicesAPI.list();
      setAllInvoices(invoicesData);

      // Fetch all customers and items via API base helper
  const apiBase = getApiBaseUrl() || '';
  if (apiBase) {
    const customersResponse = await fetch(`${apiBase}/customers`);
    const customersData = await customersResponse.json();
    setAllCustomers(customersData);

    const itemsResponse = await fetch(`${apiBase}/items`);
    const itemsData = await itemsResponse.json();
    setAllItems(itemsData);
  } else {
    // fallback to invoicesAPI provided data where available
    setAllCustomers([]);
    setAllItems([]);
  }

    } catch (error) {
      console.error('Error fetching complete data:', error);
    }
  }; const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  useEffect(() => {
    fetchStats(false); // Don't show toast on initial load
    fetchRecentActivity();
    fetchAllData(); // Fetch complete data for single-page view
  }, []); // Remove dateRange dependency to prevent auto-filtering

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const handleFilter = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      toast('No date range selected. Showing all data.', { icon: '📅' });
    } else {
      toast('Applying date filter...', { icon: '🔍' });
    }
    // Fetch both stats and recent activity with the current filter
    fetchStats(true);
    fetchRecentActivity();
  };

  const handleReset = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    setTimeout(() => {
      fetchStats(true);
      fetchRecentActivity();
    }, 100);
  };

  const clearDateRange = () => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setTimeout(() => {
      fetchStats(true);
      fetchRecentActivity();
    }, 100);
  };

  const downloadGSTReport = async () => {
    setShowMonthModal(true);
  };

  const generateGSTReport = async () => {
    setGstReportLoading(true);
    setShowMonthModal(false);

    try {
      // Parse selected month to get date range
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      const reportDateRange = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      console.log('Generating GST report for month:', selectedMonth, reportDateRange);

      // Fetch invoices for the date range
  const invoices = await invoicesAPI.list();

      // Filter invoices by date range
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.createdAt || invoice.invoiceDate);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      });

      // Generate GST report data
      const gstReport = {
        reportGenerated: new Date().toISOString(),
        reportMonth: selectedMonth,
        dateRange: reportDateRange,
        summary: {
          totalInvoices: filteredInvoices.length,
          totalRevenue: filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
          totalTax: filteredInvoices.reduce((sum, inv) => sum + (inv.totalTax || 0), 0),
          b2bInvoices: filteredInvoices.filter(inv => inv.billingType === 'B2B').length,
          b2cInvoices: filteredInvoices.filter(inv => inv.billingType === 'B2C').length,
        },
        taxBreakdown: {
          cgst: 0,
          sgst: 0,
          igst: 0,
        },
        invoiceDetails: filteredInvoices.map(invoice => ({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.createdAt || invoice.invoiceDate,
          customerName: invoice.customer?.name || invoice.customer?.firmName || 'Unknown',
          customerGST: invoice.customer?.gstNo || 'N/A',
          billingType: invoice.billingType,
          subtotal: invoice.totalBeforeTax || 0,
          totalTax: invoice.totalTax || 0,
          grandTotal: invoice.grandTotal || 0,
          items: invoice.items?.map(item => ({
            name: item.name,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            rate: item.rate,
            taxSlab: item.taxSlab,
            taxableAmount: item.taxableAmount,
            tax: item.tax
          })) || []
        }))
      };

      // Calculate tax breakdown
      filteredInvoices.forEach(invoice => {
        invoice.items?.forEach(item => {
          if (item.tax) {
            if (item.tax.cgst) gstReport.taxBreakdown.cgst += item.tax.cgst;
            if (item.tax.sgst) gstReport.taxBreakdown.sgst += item.tax.sgst;
            if (item.tax.igst) gstReport.taxBreakdown.igst += item.tax.igst;
          }
        });
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(gstReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
      link.download = `GST_Report_${monthName.replace(' ', '_')}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`GST report downloaded for ${monthName} (${filteredInvoices.length} invoices)`);

    } catch (error) {
      console.error('Error generating GST report:', error);
      toast.error('Failed to generate GST report');
    } finally {
      setGstReportLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      invoice: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      payment: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      customer: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      item: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    }
    return icons[type] || icons.invoice
  };

  const getActivityColor = (type) => {
    const colors = {
      invoice: 'bg-blue-100 text-blue-600',
      payment: 'bg-green-100 text-green-600',
      customer: 'bg-purple-100 text-purple-600',
      item: 'bg-yellow-100 text-yellow-600'
    }
    return colors[type] || colors.invoice
  };

  // Icons for stats cards
  const statsIcons = {
    revenue: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    balance: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    paid: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    invoices: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    customers: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    )
  };

  return (
    <Layout>
      <div className="space-y-8 fade-in">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 mb-2">
              Welcome back! Here's what's happening with your business today.
            </p>
            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {error ? (
                <div className="flex items-center gap-1 text-red-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Error: {error}</span>
                </div>
              ) : lastUpdated ? (
                <div className="flex items-center gap-1 text-green-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Initializing...</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              onClick={() => fetchStats(true)}
              loading={loading}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <Button
              variant="outline"
              onClick={downloadGSTReport}
              loading={gstReportLoading}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              {gstReportLoading ? 'Generating...' : 'Download GST Report'}
            </Button>
            <Button
              variant="primary"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
              onClick={() => navigate('/billing')}
            >
              New Invoice
            </Button>
          </div>
        </div>

        {/* Date Filter Section */}
        <Card className="slide-up">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleFilter}
                  loading={loading}
                  fullWidth
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  }
                >
                  {loading ? 'Filtering...' : 'Apply Filter'}
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={handleReset}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  This Month
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={clearDateRange}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  }
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={statsIcons.revenue}
            color="blue"
            gradient={true}
            className="scale-in"
          />
          <Card
            title="Balance Due"
            value={formatCurrency(stats.balanceDue)}
            icon={statsIcons.balance}
            color="red"
            className="scale-in"
            style={{ animationDelay: '0.1s' }}
          />
          <Card
            title="Total Paid"
            value={formatCurrency(stats.totalPaid)}
            icon={statsIcons.paid}
            color="green"
            className="scale-in"
            style={{ animationDelay: '0.2s' }}
          />
          <Card
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={statsIcons.invoices}
            color="purple"
            className="scale-in"
            style={{ animationDelay: '0.3s' }}
          />
          <Card
            title="Total Customers"
            value={stats.totalCustomers}
            icon={statsIcons.customers}
            color="yellow"
            className="scale-in"
            style={{ animationDelay: '0.4s' }}
          />
        </div>

        {/* Grid Layout for Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/invoices')}
                  >
                    View All
                  </Button>
                </div>

                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.action}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No recent activity found</p>
                      <p className="text-sm">Create your first invoice to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    fullWidth
                    variant="primary"
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    }
                    onClick={() => navigate('/billing')}
                  >
                    Create Invoice
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    }
                    onClick={() => navigate('/customers')}
                  >
                    Add Customer
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    }
                    onClick={() => navigate('/items')}
                  >
                    Add Item
                  </Button>
                  <Button
                    fullWidth
                    variant="ghost"
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    }
                    onClick={() => navigate('/invoices')}
                  >
                    View Invoices
                  </Button>
                </div>
              </div>
            </Card>

            {/* Business Summary */}
            <Card gradient={true} color="blue">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Business Health</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">Collection Rate</span>
                    <span className="text-white font-medium">
                      {stats.totalRevenue > 0 ? Math.round((stats.totalPaid / stats.totalRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full"
                      style={{
                        width: `${stats.totalRevenue > 0 ? Math.round((stats.totalPaid / stats.totalRevenue) * 100) : 0}%`
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-white/80 text-sm">Average Invoice</span>
                    <span className="text-white font-medium">
                      {stats.totalInvoices > 0 ? formatCurrency(stats.totalRevenue / stats.totalInvoices) : '₹0'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">Outstanding</span>
                    <span className="text-white font-medium">
                      {formatCurrency(stats.balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Month Selection Modal */}
      {showMonthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Month for GST Report</h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowMonthModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                loading={gstReportLoading}
                onClick={generateGSTReport}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                {gstReportLoading ? 'Generating...' : 'Download Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
