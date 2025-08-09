import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/dateHelpers';
import { billingAPI } from '../api/billing';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';

const EnhancedQuoteManagement = () => {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
    customer: ''
  });
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [currentQuote, setCurrentQuote] = useState({
    customer: '',
    items: [],
    notes: '',
    status: 'Draft',
    validTill: '',
    terms: 'Quote is valid for 30 days from the date of issue.'
  });
  const [currentItem, setCurrentItem] = useState({
    item: '',
    name: '',
    description: '',
    hsnCode: '',
    quantity: 1,
    rate: 0,
    discount: 0,
    taxRate: 18,
    units: 'per piece'
  });
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotesRes, customersRes, itemsRes] = await Promise.all([
        billingAPI.getAllQuotes(),
        customersAPI.getAll(),
        itemsAPI.getAll()
      ]);

      let filteredQuotes = quotesRes || [];

      // Apply filters
      if (filters.status !== 'all') {
        filteredQuotes = filteredQuotes.filter(quote => 
          quote.status.toLowerCase() === filters.status.toLowerCase()
        );
      }

      if (filters.customer) {
        filteredQuotes = filteredQuotes.filter(quote => 
          quote.customer?._id === filters.customer
        );
      }

      if (filters.search) {
        filteredQuotes = filteredQuotes.filter(quote =>
          quote.customer?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          quote.notes?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.dateFrom) {
        filteredQuotes = filteredQuotes.filter(quote =>
          new Date(quote.quoteDate) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        filteredQuotes = filteredQuotes.filter(quote =>
          new Date(quote.quoteDate) <= new Date(filters.dateTo)
        );
      }

      setQuotes(filteredQuotes);
      setCustomers(Array.isArray(customersRes) ? customersRes : customersRes.data || []);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateQuoteTotal = (items) => {
    return items.reduce((total, item) => {
      const subtotal = item.quantity * item.rate;
      const discountAmount = (subtotal * (item.discount || 0)) / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * (item.taxRate || 0)) / 100;
      return total + afterDiscount + taxAmount;
    }, 0);
  };

  const addItemToQuote = () => {
    if (!currentItem.name || currentItem.quantity <= 0 || currentItem.rate <= 0) {
      toast.error('Please fill all required item fields');
      return;
    }

    const newItem = {
      ...currentItem,
      id: Date.now(),
      amount: currentItem.quantity * currentItem.rate
    };

    setCurrentQuote(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset current item
    setCurrentItem({
      item: '',
      name: '',
      description: '',
      hsnCode: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      taxRate: 18,
      units: 'per piece'
    });

    toast.success('Item added to quote');
  };

  const removeItemFromQuote = (itemId) => {
    setCurrentQuote(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    toast.success('Item removed from quote');
  };

  const updateQuoteItem = (itemId, field, value) => {
    setCurrentQuote(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          return {
            ...updatedItem,
            amount: updatedItem.quantity * updatedItem.rate
          };
        }
        return item;
      })
    }));
  };

  const handleSaveQuote = async () => {
    if (!currentQuote.customer || currentQuote.items.length === 0) {
      toast.error('Please select a customer and add at least one item');
      return;
    }

    try {
      const quoteData = {
        ...currentQuote,
        total: calculateQuoteTotal(currentQuote.items)
      };

      if (editingQuote) {
        await billingAPI.updateQuote(editingQuote._id, quoteData);
        toast.success('Quote updated successfully');
      } else {
        await billingAPI.createQuote(quoteData);
        toast.success('Quote created successfully');
      }

      setShowNewQuote(false);
      setEditingQuote(null);
      setCurrentQuote({
        customer: '',
        items: [],
        notes: '',
        status: 'Draft',
        validTill: '',
        terms: 'Quote is valid for 30 days from the date of issue.'
      });
      fetchData();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote');
    }
  };

  const handleDeleteQuote = async (quoteId) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      try {
        await billingAPI.deleteQuote(quoteId);
        toast.success('Quote deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting quote:', error);
        toast.error('Failed to delete quote');
      }
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedQuotes.length === 0) {
      toast.error('Please select quotes and action');
      return;
    }

    try {
      if (bulkAction === 'delete') {
        if (window.confirm(`Are you sure you want to delete ${selectedQuotes.length} quotes?`)) {
          await Promise.all(selectedQuotes.map(id => billingAPI.deleteQuote(id)));
          toast.success(`${selectedQuotes.length} quotes deleted successfully`);
        }
      } else if (bulkAction === 'sent') {
        // Update status to Sent
        await Promise.all(selectedQuotes.map(id => 
          billingAPI.updateQuote(id, { status: 'Sent' })
        ));
        toast.success(`${selectedQuotes.length} quotes marked as sent`);
      } else if (bulkAction === 'draft') {
        // Update status to Draft
        await Promise.all(selectedQuotes.map(id => 
          billingAPI.updateQuote(id, { status: 'Draft' })
        ));
        toast.success(`${selectedQuotes.length} quotes marked as draft`);
      }

      setSelectedQuotes([]);
      setBulkAction('');
      fetchData();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleConvertToInvoice = async (quote) => {
    try {
      // Create invoice from quote
      const invoiceData = {
        customer: quote.customer._id,
        items: quote.items.map(item => ({
          name: item.name,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          taxRate: item.taxRate || 18,
          units: item.units || 'per piece'
        })),
        notes: `Converted from Quote. ${quote.notes || ''}`.trim(),
        billingType: 'invoice'
      };

      await billingAPI.createInvoice(invoiceData);
      
      // Update quote status to Accepted
      await billingAPI.updateQuote(quote._id, { status: 'Accepted' });
      
      toast.success('Quote converted to invoice successfully');
      fetchData();
    } catch (error) {
      console.error('Error converting quote:', error);
      toast.error('Failed to convert quote to invoice');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotes Management</h1>
          <p className="text-gray-600">Create, manage and track your quotes</p>
        </div>
        <button
          onClick={() => setShowNewQuote(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          New Quote
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Quotes</h3>
          <p className="text-2xl font-bold text-gray-900">{quotes.length}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-green-600">Accepted</h3>
          <p className="text-2xl font-bold text-green-900">
            {quotes.filter(q => q.status === 'Accepted').length}
          </p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-blue-600">Sent</h3>
          <p className="text-2xl font-bold text-blue-900">
            {quotes.filter(q => q.status === 'Sent').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-yellow-600">Total Value</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {formatCurrency(quotes.reduce((sum, quote) => sum + calculateQuoteTotal(quote.items || []), 0))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={filters.customer}
              onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Customers</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search quotes..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedQuotes.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedQuotes.length} quote(s) selected
            </span>
            <div className="flex items-center space-x-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded-md text-sm"
              >
                <option value="">Select Action</option>
                <option value="sent">Mark as Sent</option>
                <option value="draft">Mark as Draft</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedQuotes.length === quotes.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuotes(quotes.map(q => q._id));
                    } else {
                      setSelectedQuotes([]);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quote #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr key={quote._id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedQuotes.includes(quote._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedQuotes(prev => [...prev, quote._id]);
                      } else {
                        setSelectedQuotes(prev => prev.filter(id => id !== quote._id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  QUO-{quote._id.slice(-6).toUpperCase()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {quote.customer?.name || 'N/A'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(quote.quoteDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(calculateQuoteTotal(quote.items || []))}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingQuote(quote);
                        setCurrentQuote({
                          customer: quote.customer?._id || '',
                          items: quote.items || [],
                          notes: quote.notes || '',
                          status: quote.status || 'Draft',
                          validTill: quote.validTill || '',
                          terms: quote.terms || 'Quote is valid for 30 days from the date of issue.'
                        });
                        setShowNewQuote(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Quote"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleConvertToInvoice(quote)}
                      className="text-green-600 hover:text-green-900"
                      title="Convert to Invoice"
                      disabled={quote.status === 'Accepted'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteQuote(quote._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Quote"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New/Edit Quote Modal */}
      {showNewQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingQuote ? 'Edit Quote' : 'New Quote'}
              </h3>
              <button
                onClick={() => {
                  setShowNewQuote(false);
                  setEditingQuote(null);
                  setCurrentQuote({
                    customer: '',
                    items: [],
                    notes: '',
                    status: 'Draft',
                    validTill: '',
                    terms: 'Quote is valid for 30 days from the date of issue.'
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Quote Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={currentQuote.customer}
                    onChange={(e) => setCurrentQuote(prev => ({ ...prev, customer: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={currentQuote.status}
                    onChange={(e) => setCurrentQuote(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Add Item Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Item</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <select
                    value={currentItem.item}
                    onChange={(e) => {
                      const selectedItem = items.find(item => item._id === e.target.value);
                      if (selectedItem) {
                        setCurrentItem(prev => ({
                          ...prev,
                          item: selectedItem._id,
                          name: selectedItem.name,
                          hsnCode: selectedItem.hsnCode || '',
                          rate: selectedItem.rate || 0,
                          taxRate: selectedItem.taxSlab || 18,
                          units: selectedItem.units || 'per piece'
                        }));
                      } else {
                        setCurrentItem(prev => ({ ...prev, item: e.target.value }));
                      }
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Item</option>
                    {items.map(item => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={currentItem.name}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={currentItem.rate}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Discount %"
                    value={currentItem.discount}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addItemToQuote}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Items Table */}
              {currentQuote.items.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Quote Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentQuote.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.name}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuoteItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-16 px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateQuoteItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-20 px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) => updateQuoteItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-16 px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={(e) => updateQuoteItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                                className="w-16 px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {formatCurrency(item.quantity * item.rate)}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => removeItemFromQuote(item.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Remove Item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-lg font-bold">
                      Total: {formatCurrency(calculateQuoteTotal(currentQuote.items))}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes and Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={currentQuote.notes}
                    onChange={(e) => setCurrentQuote(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    value={currentQuote.terms}
                    onChange={(e) => setCurrentQuote(prev => ({ ...prev, terms: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Terms and conditions..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewQuote(false);
                    setEditingQuote(null);
                    setCurrentQuote({
                      customer: '',
                      items: [],
                      notes: '',
                      status: 'Draft',
                      validTill: '',
                      terms: 'Quote is valid for 30 days from the date of issue.'
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  {editingQuote ? 'Update Quote' : 'Save Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedQuoteManagement;
