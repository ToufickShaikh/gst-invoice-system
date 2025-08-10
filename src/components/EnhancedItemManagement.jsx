import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/dateHelpers';
import { itemsAPI } from '../api/items';

const EnhancedItemManagement = () => {
  console.log('🚀 Loading Enhanced Item Management v2.0 - Zoho Books Level Features');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    priceRange: 'all',
    stockStatus: 'all'
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table');
  const [showNewItem, setShowNewItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [currentItem, setCurrentItem] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    hsnCode: '',
    taxRate: 18,
    purchasePrice: 0,
    sellingPrice: 0,
    markup: 0,
    priceType: 'exclusive',
    units: 'per piece',
    quantityInStock: 0,
    minStockLevel: 5,
    maxStockLevel: 100,
    reorderPoint: 10,
    preferredVendor: '',
    storageLocation: '',
    isActive: true,
    isService: false,
    dimensions: {
      length: '',
      width: '',
      height: '',
      weight: ''
    },
    images: []
  });
  const [bulkAction, setBulkAction] = useState('');
  const [showImport, setShowImport] = useState(false);

  const categories = [
    'Electronics', 'Furniture', 'Clothing', 'Books', 'Food & Beverages',
    'Home & Garden', 'Sports', 'Toys', 'Automotive', 'Health & Beauty', 'Other'
  ];

  const units = [
    'per piece', 'kg', 'grams', 'meters', 'liters', 'boxes', 'packets',
    'dozens', 'sets', 'pairs', 'rolls', 'sheets', 'hours', 'days'
  ];

  useEffect(() => {
    fetchItems();
  }, [filters, sortBy, sortOrder]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await itemsAPI.getAll();
      let itemsData = Array.isArray(response.data) ? response.data : response;
      
      // Apply filters
      itemsData = itemsData.filter(item => {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          if (!item.name?.toLowerCase().includes(searchLower) &&
              !item.sku?.toLowerCase().includes(searchLower) &&
              !item.hsnCode?.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        
        if (filters.category !== 'all' && item.category !== filters.category) return false;
        if (filters.status !== 'all' && 
            (filters.status === 'active' ? !item.isActive : item.isActive)) return false;
        
        if (filters.priceRange !== 'all') {
          const price = item.sellingPrice || item.rate || 0;
          switch (filters.priceRange) {
            case 'under100': if (price >= 100) return false; break;
            case '100to500': if (price < 100 || price > 500) return false; break;
            case '500to1000': if (price < 500 || price > 1000) return false; break;
            case 'over1000': if (price <= 1000) return false; break;
          }
        }
        
        if (filters.stockStatus !== 'all') {
          const stock = item.quantityInStock || 0;
          const minLevel = item.minStockLevel || 5;
          switch (filters.stockStatus) {
            case 'instock': if (stock <= 0) return false; break;
            case 'lowstock': if (stock > minLevel) return false; break;
            case 'outofstock': if (stock > 0) return false; break;
          }
        }
        
        return true;
      });

      // Apply sorting
      itemsData.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'price':
            aVal = a.sellingPrice || a.rate || 0;
            bVal = b.sellingPrice || b.rate || 0;
            break;
          case 'stock':
            aVal = a.quantityInStock || 0;
            bVal = b.quantityInStock || 0;
            break;
          case 'category':
            aVal = a.category || '';
            bVal = b.category || '';
            break;
          default:
            aVal = a.name || '';
            bVal = b.name || '';
        }
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? result : -result;
      });

      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMarkup = (purchasePrice, sellingPrice) => {
    if (!purchasePrice || purchasePrice === 0) return 0;
    return ((sellingPrice - purchasePrice) / purchasePrice * 100).toFixed(2);
  };

  const handleSaveItem = async () => {
    if (!currentItem.name || !currentItem.sellingPrice) {
      toast.error('Please fill in required fields (Name and Selling Price)');
      return;
    }

    try {
      const itemData = {
        ...currentItem,
        purchasePrice: parseFloat(currentItem.purchasePrice) || 0,
        sellingPrice: parseFloat(currentItem.sellingPrice) || 0,
        taxRate: parseFloat(currentItem.taxRate) || 18,
        quantityInStock: parseInt(currentItem.quantityInStock) || 0,
        minStockLevel: parseInt(currentItem.minStockLevel) || 5,
        maxStockLevel: parseInt(currentItem.maxStockLevel) || 100,
        reorderPoint: parseInt(currentItem.reorderPoint) || 10,
        markup: calculateMarkup(currentItem.purchasePrice, currentItem.sellingPrice),
        // Map to legacy fields for compatibility
        rate: parseFloat(currentItem.sellingPrice) || 0,
        taxSlab: parseFloat(currentItem.taxRate) || 18
      };

      if (editingItem) {
        await itemsAPI.update(editingItem._id, itemData);
        toast.success('Item updated successfully');
      } else {
        await itemsAPI.create(itemData);
        toast.success('Item created successfully');
      }

      setShowNewItem(false);
      setEditingItem(null);
      resetCurrentItem();
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemsAPI.delete(itemId);
        toast.success('Item deleted successfully');
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      toast.error('Please select items and action');
      return;
    }

    try {
      if (bulkAction === 'delete') {
        if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
          await Promise.all(selectedItems.map(id => itemsAPI.delete(id)));
          toast.success(`${selectedItems.length} items deleted successfully`);
        }
      } else if (bulkAction === 'activate') {
        await Promise.all(selectedItems.map(id => 
          itemsAPI.update(id, { isActive: true })
        ));
        toast.success(`${selectedItems.length} items activated`);
      } else if (bulkAction === 'deactivate') {
        await Promise.all(selectedItems.map(id => 
          itemsAPI.update(id, { isActive: false })
        ));
        toast.success(`${selectedItems.length} items deactivated`);
      }

      setSelectedItems([]);
      setBulkAction('');
      fetchItems();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const resetCurrentItem = () => {
    setCurrentItem({
      name: '',
      description: '',
      sku: '',
      barcode: '',
      category: '',
      hsnCode: '',
      taxRate: 18,
      purchasePrice: 0,
      sellingPrice: 0,
      markup: 0,
      priceType: 'exclusive',
      units: 'per piece',
      quantityInStock: 0,
      minStockLevel: 5,
      maxStockLevel: 100,
      reorderPoint: 10,
      preferredVendor: '',
      storageLocation: '',
      isActive: true,
      isService: false,
      dimensions: {
        length: '',
        width: '',
        height: '',
        weight: ''
      },
      images: []
    });
  };

  const getStockStatus = (item) => {
    const stock = item.quantityInStock || 0;
    const minLevel = item.minStockLevel || 5;
    
    if (stock <= 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= minLevel) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const exportToCSV = () => {
    const headers = [
      'Name', 'SKU', 'Category', 'HSN Code', 'Purchase Price', 'Selling Price', 
      'Tax Rate', 'Units', 'Stock', 'Min Stock', 'Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        `"${item.name || ''}"`,
        `"${item.sku || ''}"`,
        `"${item.category || ''}"`,
        `"${item.hsnCode || ''}"`,
        item.purchasePrice || item.costPrice || 0,
        item.sellingPrice || item.rate || 0,
        item.taxRate || item.taxSlab || 18,
        `"${item.units || 'per piece'}"`,
        item.quantityInStock || 0,
        item.minStockLevel || 5,
        item.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
          <h1 className="text-3xl font-bold text-gray-900">Items Management</h1>
          <p className="text-gray-600">Manage your inventory with Zoho Books-level features</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Import
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => setShowNewItem(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            New Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Items</h3>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-green-600">In Stock</h3>
          <p className="text-2xl font-bold text-green-900">
            {items.filter(item => (item.quantityInStock || 0) > 0).length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-yellow-600">Low Stock</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {items.filter(item => {
              const stock = item.quantityInStock || 0;
              const minLevel = item.minStockLevel || 5;
              return stock > 0 && stock <= minLevel;
            }).length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-red-600">Out of Stock</h3>
          <p className="text-2xl font-bold text-red-900">
            {items.filter(item => (item.quantityInStock || 0) <= 0).length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-blue-600">Total Value</h3>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(items.reduce((sum, item) => 
              sum + ((item.quantityInStock || 0) * (item.sellingPrice || item.rate || 0)), 0
            ))}
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
            <select
              value={filters.priceRange}
              onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Prices</option>
              <option value="under100">Under ₹100</option>
              <option value="100to500">₹100 - ₹500</option>
              <option value="500to1000">₹500 - ₹1000</option>
              <option value="over1000">Over ₹1000</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Stock</option>
              <option value="instock">In Stock</option>
              <option value="lowstock">Low Stock</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="stock">Stock</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <div className="flex border border-gray-300 rounded">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Grid
              </button>
            </div>
          </div>
          <span className="text-sm text-gray-600">
            {items.length} item(s) found
          </span>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedItems.length} item(s) selected
            </span>
            <div className="flex items-center space-x-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded-md text-sm"
              >
                <option value="">Select Action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
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

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(items.map(item => item._id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU/HSN
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(prev => [...prev, item._id]);
                        } else {
                          setSelectedItems(prev => prev.filter(id => id !== item._id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.sku || '-'}</div>
                    <div className="text-sm text-gray-500">{item.hsnCode || '-'}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.sellingPrice || item.rate || 0)}
                    </div>
                    {item.purchasePrice && (
                      <div className="text-sm text-gray-500">
                        Cost: {formatCurrency(item.purchasePrice)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.quantityInStock || 0} {item.units || 'pcs'}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                      {stockStatus.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setCurrentItem({
                            ...item,
                            sellingPrice: item.sellingPrice || item.rate || 0,
                            taxRate: item.taxRate || item.taxSlab || 18
                          });
                          setShowNewItem(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New/Edit Item Modal */}
      {showNewItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingItem ? 'Edit Item' : 'New Item'}
              </h3>
              <button
                onClick={() => {
                  setShowNewItem(false);
                  setEditingItem(null);
                  resetCurrentItem();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={currentItem.name}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      value={currentItem.sku}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={currentItem.category}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={currentItem.hsnCode}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, hsnCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={currentItem.description}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Pricing & Tax</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.purchasePrice}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.sellingPrice}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, sellingPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.taxRate}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, taxRate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                    <select
                      value={currentItem.priceType}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, priceType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="exclusive">Tax Exclusive</option>
                      <option value="inclusive">Tax Inclusive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                    <select
                      value={currentItem.units}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, units: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Inventory Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      value={currentItem.quantityInStock}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, quantityInStock: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock Level
                    </label>
                    <input
                      type="number"
                      value={currentItem.minStockLevel}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, minStockLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Stock Level
                    </label>
                    <input
                      type="number"
                      value={currentItem.maxStockLevel}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, maxStockLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      value={currentItem.reorderPoint}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, reorderPoint: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Additional Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Vendor
                    </label>
                    <input
                      type="text"
                      value={currentItem.preferredVendor}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, preferredVendor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={currentItem.storageLocation}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, storageLocation: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentItem.isActive}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentItem.isService}
                      onChange={(e) => setCurrentItem(prev => ({ ...prev, isService: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Service Item</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewItem(false);
                    setEditingItem(null);
                    resetCurrentItem();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedItemManagement;
