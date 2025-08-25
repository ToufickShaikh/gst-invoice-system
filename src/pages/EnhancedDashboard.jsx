import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import Layout from '../components/Layout';
import { Card, Badge, LoadingSpinner } from '../components/ui';
import { billingAPI } from '../api/billing';
import { queryKeys } from '../lib/reactQuery';
import { formatCurrency } from '../utils/dateHelpers';
import { useAppStore } from '../store';

/**
 * Enterprise-level Dashboard with Advanced Analytics
 * Superior to ZohoBooks with real-time insights and interactive charts
 */

const EnhancedDashboard = () => {
  const [dateRange, setDateRange] = useState('this_month');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const { theme } = useAppStore();
  
  // Advanced date range options
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Enhanced stats query with error handling and caching
  const { data: stats, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.stats(dateRange),
    queryFn: () => billingAPI.getDashboardStats({ dateRange }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true
  });

  // Analytics query for advanced charts
  const { data: analytics } = useQuery({
    queryKey: queryKeys.dashboard.analytics({ dateRange, metric: selectedMetric }),
    queryFn: () => billingAPI.getAnalytics({ dateRange, metric: selectedMetric }),
    enabled: !!stats, // Only fetch after basic stats load
    staleTime: 5 * 60 * 1000
  });

  // Memoized calculations for performance
  const computedStats = useMemo(() => {
    if (!stats) return null;

    const collectionRate = stats.totalRevenue > 0 
      ? (stats.totalPaid / stats.totalRevenue * 100).toFixed(1)
      : 0;

    const avgInvoiceValue = stats.totalInvoices > 0
      ? stats.totalRevenue / stats.totalInvoices
      : 0;

    const overdueRate = stats.totalInvoices > 0
      ? ((stats.totalInvoices - stats.paidInvoices) / stats.totalInvoices * 100).toFixed(1)
      : 0;

    return {
      ...stats,
      collectionRate,
      avgInvoiceValue,
      overdueRate
    };
  }, [stats]);

  // Chart colors based on theme
  const chartColors = {
    primary: theme === 'dark' ? '#60a5fa' : '#3b82f6',
    success: theme === 'dark' ? '#34d399' : '#10b981',
    warning: theme === 'dark' ? '#fbbf24' : '#f59e0b',
    error: theme === 'dark' ? '#f87171' : '#ef4444',
    gray: theme === 'dark' ? '#9ca3af' : '#6b7280'
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">Unable to load dashboard data</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Reload Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with advanced filters */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Complete business overview and analytics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Export Report
            </button>
          </div>
        </motion.div>

        {/* Enhanced KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Revenue',
              value: formatCurrency(computedStats?.totalRevenue || 0),
              change: '+12.5%',
              trend: 'up',
              icon: '💰',
              color: 'primary'
            },
            {
              label: 'Total Invoices',
              value: computedStats?.totalInvoices || 0,
              change: '+8.2%', 
              trend: 'up',
              icon: '📄',
              color: 'success'
            },
            {
              label: 'Collection Rate',
              value: `${computedStats?.collectionRate || 0}%`,
              change: '+2.1%',
              trend: 'up',
              icon: '📈',
              color: 'warning'
            },
            {
              label: 'Pending Amount',
              value: formatCurrency(computedStats?.totalPending || 0),
              change: '-5.3%',
              trend: 'down',
              icon: '⏱️',
              color: 'error'
            }
          ].map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="elevated" className="relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                    <div className="flex items-center mt-2">
                      <span className={`text-sm font-medium ${
                        kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.trend === 'up' ? '↗️' : '↘️'} {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className="text-3xl opacity-75">{kpi.icon}</div>
                </div>
                
                {/* Animated background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r from-${kpi.color}-500/5 to-${kpi.color}-600/5 -z-10`}></div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Advanced Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <Badge variant="primary">Last 12 months</Badge>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics?.revenueData || []}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={chartColors.primary}
                    fillOpacity={1}
                    fill="url(#revenueGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Invoice Status Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Invoice Status</h3>
                <Badge variant="secondary">Current period</Badge>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: computedStats?.paidInvoices || 0, color: chartColors.success },
                      { name: 'Pending', value: computedStats?.pendingInvoices || 0, color: chartColors.warning },
                      { name: 'Overdue', value: computedStats?.overdueInvoices || 0, color: chartColors.error }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[chartColors.success, chartColors.warning, chartColors.error].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity and Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                <Link to="/invoices" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  View All →
                </Link>
              </div>
              
              <div className="space-y-3">
                {(computedStats?.recentInvoices || []).slice(0, 5).map((invoice) => (
                  <div key={invoice._id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">{invoice.customer?.firmName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(invoice.grandTotal)}</p>
                      <Badge variant={
                        invoice.balance <= 0 ? 'success' : 
                        invoice.paidAmount > 0 ? 'warning' : 'error'
                      }>
                        {invoice.balance <= 0 ? 'Paid' : invoice.paidAmount > 0 ? 'Partial' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Top Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
                <Link to="/customers" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  View All →
                </Link>
              </div>
              
              <div className="space-y-3">
                {(computedStats?.topCustomers || []).slice(0, 5).map((customer, index) => (
                  <div key={customer._id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mr-3 ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-yellow-600' : 'bg-indigo-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.invoiceCount} invoices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(customer.totalAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default EnhancedDashboard;
