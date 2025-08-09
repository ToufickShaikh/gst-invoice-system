import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/dateHelpers';
import Button from './Button';

const InvoiceFilters = ({ 
  onFilterChange, 
  totalInvoices = 0, 
  totalAmount = 0, 
  filteredCount = 0 
}) => {
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // all, paid, partial, overdue, draft
    dateRange: 'all', // all, today, this_week, this_month, this_quarter, this_year, custom
    customStartDate: '',
    customEndDate: '',
    amountMin: '',
    amountMax: '',
    customerType: 'all', // all, B2B, B2C
    paymentMethod: 'all' // all, UPI, Cash, Card, Bank Transfer, Cheque
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
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
    setShowAdvancedFilters(false);
  };

  const getDateRangeOptions = () => [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const getStatusOptions = () => [
    { value: 'all', label: 'All Status', count: totalInvoices },
    { value: 'paid', label: 'Paid', count: 0 },
    { value: 'partial', label: 'Partially Paid', count: 0 },
    { value: 'overdue', label: 'Overdue', count: 0 },
    { value: 'draft', label: 'Draft', count: 0 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalInvoices}</div>
          <div className="text-sm text-gray-500">Total Invoices</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
          <div className="text-sm text-gray-500">Total Amount</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{filteredCount}</div>
          <div className="text-sm text-gray-500">Filtered Results</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {totalInvoices > 0 ? Math.round((filteredCount / totalInvoices) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-500">Match Rate</div>
        </div>
      </div>

      {/* Main Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search invoices, customers..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Filter */}
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          {getStatusOptions().map(option => (
            <option key={option.value} value={option.value}>
              {option.label} {option.count > 0 && `(${option.count})`}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters.dateRange}
          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
        >
          {getDateRangeOptions().map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {/* Customer Type */}
        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filters.customerType}
          onChange={(e) => handleFilterChange('customerType', e.target.value)}
        >
          <option value="all">All Customers</option>
          <option value="B2B">B2B Customers</option>
          <option value="B2C">B2C Customers</option>
        </select>
      </div>

      {/* Custom Date Range */}
      {filters.dateRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.customStartDate}
              onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={filters.customEndDate}
              onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Advanced Filters Toggle */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          }
        >
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Clear All
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Advanced Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
              <input
                type="number"
                placeholder="₹0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
              <input
                type="number"
                placeholder="₹999999"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceFilters;
