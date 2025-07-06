// Enhanced Dashboard with modern responsive design and animations
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { billingAPI } from '../api/billing';
import { formatCurrency } from '../utils/dateHelpers';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    balanceDue: 0,
    totalPaid: 0,
    totalInvoices: 0,
    totalCustomers: 0,
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [recentActivity] = useState([
    { id: 1, action: 'Invoice Generated', description: 'INV-2024-001 for ABC Corp', time: '2 minutes ago', type: 'invoice' },
    { id: 2, action: 'Payment Received', description: '₹50,000 from XYZ Ltd', time: '15 minutes ago', type: 'payment' },
    { id: 3, action: 'Customer Added', description: 'New customer: Tech Solutions', time: '1 hour ago', type: 'customer' },
    { id: 4, action: 'Item Updated', description: 'Steel Die price updated', time: '2 hours ago', type: 'item' }
  ]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await billingAPI.getDashboardStats(dateRange);
      setStats({
        totalRevenue: data.totalRevenue || 0,
        balanceDue: data.balanceDue || 0,
        totalPaid: data.totalPaid || 0,
        totalInvoices: data.totalInvoices || 0,
        totalCustomers: data.totalCustomers || 0,
      });
    } catch (error) {
      toast.error('Failed to fetch dashboard stats. Please try again later.');
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const handleFilter = () => {
    fetchStats();
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
  }

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
  }

  const getActivityColor = (type) => {
    const colors = {
      invoice: 'bg-blue-100 text-blue-600',
      payment: 'bg-green-100 text-green-600',
      customer: 'bg-purple-100 text-purple-600',
      item: 'bg-yellow-100 text-yellow-600'
    }
    return colors[type] || colors.invoice
  }

  return (
    <Layout>
      <div className="space-y-8 fade-in">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's what's happening with your business today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Export Report
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InputField
                label="Start Date"
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                leftIcon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
              />
              <InputField
                label="End Date"
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                leftIcon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
              />
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
                  onClick={() => {
                    setDateRange({ startDate: '', endDate: '' })
                    fetchStats()
                  }}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  Reset
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
            trend={{ direction: 'up', value: '+12.5%' }}
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
            trend={{ direction: 'up', value: '+8.2%' }}
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
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>

                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
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
                  ))}
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
                    onClick={() => {
                      console.log('Create Invoice button clicked');
                      navigate('/billing');
                    }}
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
                    onClick={() => {
                      console.log('Add Customer button clicked');
                      navigate('/customers');
                    }}
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
                    onClick={() => {
                      console.log('Add Item button clicked');
                      navigate('/items');
                    }}
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
                    onClick={() => {
                      console.log('View Reports button clicked');
                      navigate('/invoices');
                    }}
                  >
                    View Reports
                  </Button>

                  {/* Assignment Buttons */}
                  <div className="border-t pt-3 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Work Assignments</h4>
                    <Button
                      fullWidth
                      variant="success"
                      size="sm"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      }
                      onClick={() => {
                        console.log('Assign Task button clicked');
                        navigate('/assignments', {
                          state: {
                            prefilledTask: 'General Task Assignment',
                            assignmentType: 'general'
                          }
                        });
                      }}
                    >
                      Assign Task
                    </Button>
                    <Button
                      fullWidth
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      }
                      className="mt-2"
                      onClick={() => {
                        console.log('Manage Workers button clicked');
                        navigate('/assignments');
                      }}
                    >
                      Manage Workers
                    </Button>
                    <Button
                      fullWidth
                      variant="ghost"
                      size="sm"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      }
                      className="mt-2"
                      onClick={() => {
                        console.log('Track Progress button clicked');
                        navigate('/assignments');
                      }}
                    >
                      Track Progress
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Business Summary */}
            <Card gradient={true} color="yellow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Business Health</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">Collection Rate</span>
                    <span className="text-white font-medium">85%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-white/80 text-sm">Average Invoice Value</span>
                    <span className="text-white font-medium">₹45,250</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">This Month Growth</span>
                    <span className="text-white font-medium">+23%</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;