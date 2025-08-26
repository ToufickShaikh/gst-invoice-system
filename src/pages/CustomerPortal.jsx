// src/pages/CustomerPortal.jsx
// Advanced Customer Portal with Payment Integration
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, 
  Download, 
  Eye, 
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Bell,
  Settings,
  User,
  Activity,
  TrendingUp,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui';
import { Card } from '../components/ui';
import { Modal } from '../components/ui';
import { Input } from '../components/ui';
import { Badge } from '../components/ui';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { useAppStore } from '../store';
import { formatCurrency, formatDate } from '../utils/formatting';
import { api } from '../api';
import { getAppBasePath } from '../utils/appBase';

const CustomerPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: '30d',
    search: ''
  });
  
  const { user, notifications, addNotification } = useAppStore();
  const queryClient = useQueryClient();

  // Fetch customer data
  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customerPortal', user?.id],
    queryFn: () => api.get(`/customers/${user?.id}/portal`),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch invoices with filters
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['customerInvoices', user?.id, filters],
    queryFn: () => api.get(`/customers/${user?.id}/invoices`, { params: filters }),
    enabled: !!user?.id,
  });

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: (paymentData) => api.post('/enterprise/payments/create-order', paymentData),
    onSuccess: (data) => {
      window.open(data.paymentUrl, '_blank');
      setPaymentModal(false);
      addNotification({
        type: 'success',
        message: 'Payment process initiated successfully!'
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        message: error.response?.data?.message || 'Payment initiation failed'
      });
    }
  });

  const handlePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentModal(true);
  };

  const processPayment = (paymentMethod) => {
    paymentMutation.mutate({
      amount: selectedInvoice.outstandingAmount,
      currency: 'INR',
      invoiceId: selectedInvoice._id,
      customerId: user?.id,
      description: `Payment for Invoice ${selectedInvoice.invoiceNumber}`,
      customerDetails: {
        name: user?.name,
        email: user?.email,
        phone: user?.phone
      },
      gateway: paymentMethod === 'upi' ? 'razorpay' : 'razorpay',
      paymentMethods: [paymentMethod]
    });
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'statements', label: 'Statements', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      width: 120,
      render: (value) => (
        <span className="font-mono text-sm font-semibold text-blue-600">
          {value}
        </span>
      )
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      width: 100,
      render: (value) => formatDate(value)
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      width: 100,
      render: (value) => (
        <span className={`${new Date(value) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
          {formatDate(value)}
        </span>
      )
    },
    {
      key: 'grandTotal',
      header: 'Amount',
      width: 100,
      render: (value) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'outstandingAmount',
      header: 'Outstanding',
      width: 120,
      render: (value, row) => (
        <span className={`font-semibold ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      render: (value) => (
        <Badge 
          variant={
            value === 'paid' ? 'success' : 
            value === 'overdue' ? 'error' : 
            value === 'partial' ? 'warning' : 
            'default'
          }
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
          render: (_, row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const prefix = getAppBasePath();
              window.open(`${prefix}/invoices/${row._id}/view`, '_blank');
            }}
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const prefix = getAppBasePath();
              window.open(`${prefix}/invoices/${row._id}/download`, '_blank');
            }}
          >
            <Download className="w-3 h-3" />
          </Button>
          {row.outstandingAmount > 0 && (
            <Button
              size="sm"
              onClick={() => handlePayment(row)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-3 h-3" />
            </Button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchInvoices()}
                disabled={invoicesLoading}
              >
                <RefreshCw className={`w-4 h-4 ${invoicesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-500" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-0 overflow-hidden">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardTab customerData={customerData} />
                )}

                {activeTab === 'invoices' && (
                  <div className="space-y-6">
                    {/* Filters */}
                    <Card className="p-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search invoices..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-64"
                          />
                        </div>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="partial">Partial</option>
                        </select>
                        <select
                          value={filters.dateRange}
                          onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="30d">Last 30 days</option>
                          <option value="3m">Last 3 months</option>
                          <option value="6m">Last 6 months</option>
                          <option value="1y">Last year</option>
                          <option value="all">All time</option>
                        </select>
                      </div>
                    </Card>

                    {/* Invoices Table */}
                    <Card>
                      <VirtualizedTable
                        data={invoices?.data || []}
                        columns={invoiceColumns}
                        height={600}
                        loading={invoicesLoading}
                      />
                    </Card>
                  </div>
                )}

                {activeTab === 'payments' && (
                  <PaymentsTab customerId={user?.id} />
                )}

                {activeTab === 'statements' && (
                  <StatementsTab customerId={user?.id} />
                )}

                {activeTab === 'profile' && (
                  <ProfileTab user={user} />
                )}

                {activeTab === 'notifications' && (
                  <NotificationsTab />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        title="Make Payment"
        size="md"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Invoice Number:</span>
                <span className="font-semibold">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Due Date:</span>
                <span>{formatDate(selectedInvoice.dueDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount Due:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(selectedInvoice.outstandingAmount)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Choose Payment Method:</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => processPayment('card')}
                  disabled={paymentMutation.isPending}
                  className="h-16 flex flex-col items-center justify-center"
                >
                  <CreditCard className="w-6 h-6 mb-1" />
                  Credit/Debit Card
                </Button>
                <Button
                  onClick={() => processPayment('upi')}
                  disabled={paymentMutation.isPending}
                  className="h-16 flex flex-col items-center justify-center"
                >
                  📱
                  UPI Payment
                </Button>
                <Button
                  onClick={() => processPayment('netbanking')}
                  disabled={paymentMutation.isPending}
                  className="h-16 flex flex-col items-center justify-center"
                >
                  🏦
                  Net Banking
                </Button>
                <Button
                  onClick={() => processPayment('wallet')}
                  disabled={paymentMutation.isPending}
                  className="h-16 flex flex-col items-center justify-center"
                >
                  💰
                  Digital Wallet
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              🔒 Your payment is secured with industry-standard encryption
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = ({ customerData }) => {
  const stats = customerData?.stats || {};
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Outstanding Amount"
        value={formatCurrency(stats.outstandingAmount || 0)}
        icon={DollarSign}
        color="red"
        trend={stats.outstandingTrend}
      />
      <StatCard
        title="Total Invoices"
        value={stats.totalInvoices || 0}
        icon={FileText}
        color="blue"
        trend={stats.invoiceTrend}
      />
      <StatCard
        title="Paid This Month"
        value={formatCurrency(stats.paidThisMonth || 0)}
        icon={CheckCircle}
        color="green"
        trend={stats.paymentTrend}
      />
      <StatCard
        title="Overdue Invoices"
        value={stats.overdueInvoices || 0}
        icon={AlertCircle}
        color="orange"
        trend={stats.overdueTrend}
      />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colors = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↗' : '↘'} {trend.percentage}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};

// Placeholder components for other tabs
const PaymentsTab = ({ customerId }) => (
  <Card className="p-6">
    <h3 className="text-lg font-semibold mb-4">Payment History</h3>
    <p className="text-gray-600">Payment history will be displayed here.</p>
  </Card>
);

const StatementsTab = ({ customerId }) => (
  <Card className="p-6">
    <h3 className="text-lg font-semibold mb-4">Account Statements</h3>
    <p className="text-gray-600">Account statements will be displayed here.</p>
  </Card>
);

const ProfileTab = ({ user }) => (
  <Card className="p-6">
    <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
    <p className="text-gray-600">Profile settings will be available here.</p>
  </Card>
);

const NotificationsTab = () => (
  <Card className="p-6">
    <h3 className="text-lg font-semibold mb-4">Notifications</h3>
    <p className="text-gray-600">Notification preferences and history.</p>
  </Card>
);

export default CustomerPortal;
