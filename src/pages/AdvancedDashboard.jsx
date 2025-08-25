import React, { useState, useEffect } from 'react';
import { billingAPI } from '../api/billing';
import { invoicesAPI } from '../api/invoices';
import Layout from '../components/Layout';
import { formatCurrency } from '../utils/dateHelpers';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AdvancedDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('this_month');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    avgInvoiceValue: 0,
    collectionRate: 0,
    overdueAmount: 0,
    recentInvoices: [],
    topCustomers: [],
    monthlyTrends: [],
    paymentMethodBreakdown: {},
    customerTypeBreakdown: {}
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardStats, invoices] = await Promise.all([
        billingAPI.getDashboardStats({ 
          startDate: getStartDate(dateRange),
          endDate: new Date().toISOString().split('T')[0]
        }),
  invoicesAPI.list()
      ]);

      // Process the data
      const processedStats = processInvoiceData(invoices || []);
      setStats({
        ...dashboardStats,
        ...processedStats
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range) => {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
      case 'this_week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return weekStart.toISOString().split('T')[0];
      case 'this_month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
      case 'this_year':
        return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
  };

  const processInvoiceData = (invoices) => {
    const filtered = invoices.filter(inv => {
      const invDate = new Date(inv.invoiceDate);
      const startDate = new Date(getStartDate(dateRange));
      return invDate >= startDate;
    });

    const totalRevenue = filtered.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0);
    const totalPaid = filtered.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalPending = totalRevenue - totalPaid;

    // Calculate overdue amount
    const overdueAmount = filtered.reduce((sum, inv) => {
      const balance = (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0);
      if (balance <= 0) return sum;
      
      const invoiceDate = new Date(inv.invoiceDate);
      const dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      return new Date() > dueDate ? sum + balance : sum;
    }, 0);

    // Top customers by revenue
    const customerRevenue = {};
    filtered.forEach(inv => {
      if (inv.customer) {
        const key = inv.customer._id;
        const name = inv.customer.firmName || inv.customer.name;
        if (!customerRevenue[key]) {
          customerRevenue[key] = { name, revenue: 0, invoices: 0 };
        }
        customerRevenue[key].revenue += inv.grandTotal || inv.totalAmount || 0;
        customerRevenue[key].invoices += 1;
      }
    });

    const topCustomers = Object.values(customerRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Payment method breakdown
    const paymentMethodBreakdown = {};
    filtered.forEach(inv => {
      const method = inv.paymentMethod || 'Not Specified';
      paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + (inv.paidAmount || 0);
    });

    // Customer type breakdown
    const customerTypeBreakdown = {};
    filtered.forEach(inv => {
      if (inv.customer) {
        const type = inv.customer.customerType || 'Unknown';
        if (!customerTypeBreakdown[type]) {
          customerTypeBreakdown[type] = { revenue: 0, count: 0 };
        }
        customerTypeBreakdown[type].revenue += inv.grandTotal || inv.totalAmount || 0;
        customerTypeBreakdown[type].count += 1;
      }
    });

    // Recent invoices
    const recentInvoices = filtered
      .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
      .slice(0, 5);

    return {
      totalInvoices: filtered.length,
      totalRevenue,
      totalPaid,
      totalPending,
      avgInvoiceValue: filtered.length > 0 ? totalRevenue / filtered.length : 0,
      collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
      overdueAmount,
      recentInvoices,
      topCustomers,
      paymentMethodBreakdown,
      customerTypeBreakdown
    };
  };

  const StatCard = ({ title, value, subtitle, color = 'blue', trend, icon, onClick }) => (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`${trend > 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </span>
          <span className="text-gray-500 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your business performance and key metrics</p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
            <Button
              variant="primary"
              onClick={() => navigate('/billing')}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              New Invoice
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            subtitle={`${stats.totalInvoices} invoices`}
            color="blue"
            onClick={() => navigate('/invoices')}
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
          />
          
          <StatCard
            title="Amount Collected"
            value={formatCurrency(stats.totalPaid)}
            subtitle={`${stats.collectionRate.toFixed(1)}% collection rate`}
            color="green"
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Outstanding Amount"
            value={formatCurrency(stats.totalPending)}
            subtitle="Pending collection"
            color="orange"
            icon={
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Overdue Amount"
            value={formatCurrency(stats.overdueAmount)}
            subtitle="Requires attention"
            color="red"
            icon={
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
          />
        </div>

        {/* Charts and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Type Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Type Revenue</h3>
            <div className="space-y-4">
              {Object.entries(stats.customerTypeBreakdown).map(([type, data]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{type}</span>
                    <span className="text-sm text-gray-500">{data.count} invoices</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className={`h-2 rounded-full ${type === 'B2B' ? 'bg-blue-500' : 'bg-green-500'}`}
                        style={{ 
                          width: `${stats.totalRevenue > 0 ? (data.revenue / stats.totalRevenue) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-0">
                      {formatCurrency(data.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
            <div className="space-y-3">
              {stats.topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.invoices} invoices</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(customer.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/invoices')}
            >
              View All
            </Button>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentInvoices.map((invoice) => {
                  const balance = (invoice.grandTotal || invoice.totalAmount || 0) - (invoice.paidAmount || 0);
                  const isPaid = balance <= 0;
                  const isPartial = balance > 0 && (invoice.paidAmount || 0) > 0;
                  
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.customer?.firmName || invoice.customer?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.grandTotal || invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isPaid 
                            ? 'bg-green-100 text-green-800' 
                            : isPartial 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/billing')}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Create Invoice
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/customers')}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
            >
              Manage Customers
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/items')}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            >
              Manage Items
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/invoices')}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            >
              View Reports
            </Button>
            {/* New: GST Filings quick link */}
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/gst-filings')}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
              }
            >
              GST Filings
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdvancedDashboard;
