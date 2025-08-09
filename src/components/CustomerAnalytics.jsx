import React, { useState } from 'react';
import { formatCurrency } from '../utils/dateHelpers';

const CustomerAnalytics = ({ customers = [], invoices = [] }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Calculate customer analytics
  const analytics = React.useMemo(() => {
    const now = new Date();
    let startDate;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredInvoices = invoices.filter(inv => new Date(inv.invoiceDate) >= startDate);

    // Customer metrics
    const customerMetrics = {};
    customers.forEach(customer => {
      const customerInvoices = filteredInvoices.filter(inv => 
        inv.customer && inv.customer._id === customer._id
      );

      const totalRevenue = customerInvoices.reduce((sum, inv) => 
        sum + (inv.grandTotal || inv.totalAmount || 0), 0
      );
      const totalPaid = customerInvoices.reduce((sum, inv) => 
        sum + (inv.paidAmount || 0), 0
      );
      const totalOutstanding = totalRevenue - totalPaid;

      const lastInvoiceDate = customerInvoices.length > 0 
        ? Math.max(...customerInvoices.map(inv => new Date(inv.invoiceDate).getTime()))
        : null;

      const avgInvoiceValue = customerInvoices.length > 0 ? totalRevenue / customerInvoices.length : 0;

      customerMetrics[customer._id] = {
        ...customer,
        invoiceCount: customerInvoices.length,
        totalRevenue,
        totalPaid,
        totalOutstanding,
        lastInvoiceDate: lastInvoiceDate ? new Date(lastInvoiceDate) : null,
        avgInvoiceValue,
        paymentRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0
      };
    });

    // Sort by revenue
    const topCustomers = Object.values(customerMetrics)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Customer type breakdown
    const typeBreakdown = customers.reduce((acc, customer) => {
      const type = customer.customerType || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Active vs inactive customers
    const activeCustomers = Object.values(customerMetrics).filter(c => c.invoiceCount > 0);
    const inactiveCustomers = Object.values(customerMetrics).filter(c => c.invoiceCount === 0);

    // Geographic distribution (by state)
    const geoDistribution = customers.reduce((acc, customer) => {
      const state = customer.state ? customer.state.split('-')[1] || customer.state : 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      inactiveCustomers: inactiveCustomers.length,
      topCustomers,
      typeBreakdown,
      geoDistribution,
      avgCustomerValue: activeCustomers.length > 0 
        ? activeCustomers.reduce((sum, c) => sum + c.totalRevenue, 0) / activeCustomers.length 
        : 0
    };
  }, [customers, invoices, selectedPeriod]);

  const StatCard = ({ title, value, subtitle, color = 'blue', icon }) => (
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
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Customer Analytics</h3>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Customers"
          value={analytics.totalCustomers}
          subtitle="All registered"
          color="blue"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          }
        />
        
        <StatCard
          title="Active Customers"
          value={analytics.activeCustomers}
          subtitle="With transactions"
          color="green"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        
        <StatCard
          title="Inactive Customers"
          value={analytics.inactiveCustomers}
          subtitle="No recent activity"
          color="orange"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        
        <StatCard
          title="Avg Customer Value"
          value={formatCurrency(analytics.avgCustomerValue)}
          subtitle="Per active customer"
          color="purple"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-medium text-gray-900 mb-4">Top Customers by Revenue</h4>
          <div className="space-y-3">
            {analytics.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={customer._id} className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {customer.firmName || customer.name}
                    </p>
                    <p className="text-xs text-gray-500">{customer.invoiceCount} invoices</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 ml-2">
                  {formatCurrency(customer.totalRevenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Type Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-medium text-gray-900 mb-4">Customer Types</h4>
          <div className="space-y-3">
            {Object.entries(analytics.typeBreakdown).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{type}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${type === 'B2B' ? 'bg-blue-500' : 'bg-green-500'}`}
                    style={{ 
                      width: `${analytics.totalCustomers > 0 ? (count / analytics.totalCustomers) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="font-medium text-gray-900 mb-4">Geographic Distribution</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(analytics.geoDistribution)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([state, count]) => (
                <div key={state} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate">{state}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;
