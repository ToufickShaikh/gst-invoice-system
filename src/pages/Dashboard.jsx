import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { billingAPI } from '../api/billing';
import { formatCurrency } from '../utils/dateHelpers';

const Dashboard = () => {
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

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Date Filter */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Start Date"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
            <InputField
              label="End Date"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
            <div className="flex items-end">
              <Button onClick={handleFilter} disabled={loading}>
                {loading ? 'Filtering...' : 'Filter'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            color="blue"
          />
          <Card
            title="Balance Due"
            value={formatCurrency(stats.balanceDue)}
            color="red"
          />
          <Card
            title="Total Paid"
            value={formatCurrency(stats.totalPaid)}
            color="green"
          />
          <Card
            title="Total Invoices"
            value={stats.totalInvoices}
            color="purple"
          />
          <Card
            title="Total Customers"
            value={stats.totalCustomers}
            color="yellow"
          />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;