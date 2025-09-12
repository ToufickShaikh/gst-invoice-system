import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [tenants, setTenants] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    companyName: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    fetchStats();
    fetchTenants();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newTenant)
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Tenant created successfully');
        setShowCreateForm(false);
        setNewTenant({ name: '', companyName: '', adminEmail: '', adminPassword: '' });
        fetchTenants();
        fetchStats();
      } else {
        toast.error(data.message || 'Failed to create tenant');
      }
    } catch (error) {
      toast.error('Error creating tenant');
    }
  };

  const handleDeleteTenant = async (tenantId, tenantName) => {
    if (window.confirm(`Are you sure you want to delete "${tenantName}" and ALL its data? This cannot be undone.`)) {
      try {
        const response = await fetch(`/api/admin/tenants/${tenantId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        if (data.success) {
          toast.success('Tenant deleted successfully');
          fetchTenants();
          fetchStats();
        } else {
          toast.error(data.message || 'Failed to delete tenant');
        }
      } catch (error) {
        toast.error('Error deleting tenant');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">Manage all tenants and system overview</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Tenants</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalTenants || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
            <p className="text-3xl font-bold text-green-600">{stats.totalUsers || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Invoices</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.totalInvoices || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Tenants</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.activeTenants || 0}</p>
          </div>
        </div>

        {/* Tenant Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Tenant Management</h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create New Tenant
              </button>
            </div>
          </div>

          {/* Create Tenant Form */}
          {showCreateForm && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Tenant Name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({...newTenant, name: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={newTenant.companyName}
                  onChange={(e) => setNewTenant({...newTenant, companyName: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="email"
                  placeholder="Admin Email"
                  value={newTenant.adminEmail}
                  onChange={(e) => setNewTenant({...newTenant, adminEmail: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="password"
                  placeholder="Admin Password"
                  value={newTenant.adminPassword}
                  onChange={(e) => setNewTenant({...newTenant, adminPassword: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Create Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tenants Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500">{tenant.companyDetails?.legalName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.stats?.users || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.stats?.invoices || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.stats?.customers || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.stats?.items || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tenant.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteTenant(tenant._id, tenant.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;