import React, { useState } from 'react';
import { formatCurrency } from '../utils/dateHelpers';

const InvoiceAnalytics = ({ invoices = [] }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Calculate analytics
  const analytics = React.useMemo(() => {
    const now = new Date();
    let filteredInvoices = invoices;

    // Filter by selected period
    switch (selectedPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredInvoices = invoices.filter(inv => new Date(inv.invoiceDate) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredInvoices = invoices.filter(inv => new Date(inv.invoiceDate) >= monthAgo);
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        filteredInvoices = invoices.filter(inv => new Date(inv.invoiceDate) >= quarterAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filteredInvoices = invoices.filter(inv => new Date(inv.invoiceDate) >= yearAgo);
        break;
    }

    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalOutstanding = totalRevenue - totalPaid;

    const paidInvoices = filteredInvoices.filter(inv => {
      const balance = (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0);
      return balance <= 0;
    });

    const partialInvoices = filteredInvoices.filter(inv => {
      const balance = (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0);
      return balance > 0 && (inv.paidAmount || 0) > 0;
    });

    const overdueInvoices = filteredInvoices.filter(inv => {
      const balance = (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0);
      if (balance <= 0) return false;
      
      const invoiceDate = new Date(inv.invoiceDate);
      const dueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
      return new Date() > dueDate;
    });

    // Customer type breakdown
    const b2bInvoices = filteredInvoices.filter(inv => inv.customer?.customerType === 'B2B');
    const b2cInvoices = filteredInvoices.filter(inv => inv.customer?.customerType === 'B2C');

    // Average invoice value
    const avgInvoiceValue = filteredInvoices.length > 0 ? totalRevenue / filteredInvoices.length : 0;

    // Collection rate
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    return {
      totalInvoices: filteredInvoices.length,
      totalRevenue,
      totalPaid,
      totalOutstanding,
      paidInvoices: paidInvoices.length,
      partialInvoices: partialInvoices.length,
      overdueInvoices: overdueInvoices.length,
      b2bCount: b2bInvoices.length,
      b2cCount: b2cInvoices.length,
      b2bRevenue: b2bInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0),
      b2cRevenue: b2cInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.totalAmount || 0), 0),
      avgInvoiceValue,
      collectionRate
    };
  }, [invoices, selectedPeriod]);

  const periodOptions = [
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'Last 12 Months' }
  ];

  const StatCard = ({ title, value, subtitle, color = 'blue', trend, icon }) => (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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
            {trend > 0 ? (
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
              </svg>
            )}
            {Math.abs(trend)}%
          </span>
          <span className="text-gray-500 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Invoice Analytics</h3>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {periodOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          subtitle={`${analytics.totalInvoices} invoices`}
          color="blue"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
        />
        
        <StatCard
          title="Amount Collected"
          value={formatCurrency(analytics.totalPaid)}
          subtitle={`${analytics.collectionRate.toFixed(1)}% collection rate`}
          color="green"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        
        <StatCard
          title="Outstanding"
          value={formatCurrency(analytics.totalOutstanding)}
          subtitle={`${analytics.overdueInvoices} overdue`}
          color="orange"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        
        <StatCard
          title="Average Invoice"
          value={formatCurrency(analytics.avgInvoiceValue)}
          subtitle="Per invoice"
          color="purple"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-medium text-gray-900 mb-4">Payment Status</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Paid</span>
              </div>
              <div className="text-sm font-medium">{analytics.paidInvoices}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Partially Paid</span>
              </div>
              <div className="text-sm font-medium">{analytics.partialInvoices}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Overdue</span>
              </div>
              <div className="text-sm font-medium">{analytics.overdueInvoices}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <div className="text-sm font-medium">
                {analytics.totalInvoices - analytics.paidInvoices - analytics.partialInvoices - analytics.overdueInvoices}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Type Breakdown */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-medium text-gray-900 mb-4">Customer Type</h4>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">B2B Customers</span>
                <span className="text-sm font-medium">{analytics.b2bCount} invoices</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${analytics.totalRevenue > 0 ? (analytics.b2bRevenue / analytics.totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{formatCurrency(analytics.b2bRevenue)}</span>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">B2C Customers</span>
                <span className="text-sm font-medium">{analytics.b2cCount} invoices</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${analytics.totalRevenue > 0 ? (analytics.b2cRevenue / analytics.totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{formatCurrency(analytics.b2cRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceAnalytics;
