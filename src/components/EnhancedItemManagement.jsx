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
  const [viewMode, setViewMode] = useState('table'); // table, grid, compact
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
    priceType: 'exclusive', // exclusive, inclusive
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

  // Categories for organization
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

      if (filters.search) {
        filteredItems = filteredItems.filter(item =>
          item.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.hsnCode?.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.description?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.category) {
        filteredItems = filteredItems.filter(item => 
          item.category === filters.category
        );
      }

      if (filters.status !== 'all') {
        filteredItems = filteredItems.filter(item => 
          item.status === filters.status
        );
      }

      if (filters.stockLevel !== 'all') {
        filteredItems = filteredItems.filter(item => {
          const stock = item.quantityInStock || 0;
          const minStock = item.minStock || 0;
          switch (filters.stockLevel) {
            case 'low':
              return stock <= minStock && stock > 0;
            case 'out':
              return stock === 0;
            case 'adequate':
              return stock > minStock;
            default:
              return true;
          }
        });
      }

      setItems(filteredItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!currentItem.name || currentItem.rate < 0) {
      toast.error('Please provide valid item details');
      return;
    }

    try {
      const itemData = {
        ...currentItem,
        quantityInStock: currentItem.currentStock
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
      setCurrentItem({
        name: '',
        description: '',
        hsnCode: '',
        rate: 0,
        taxSlab: 18,
        units: 'per piece',
        category: '',
        minStock: 0,
        maxStock: 0,
        currentStock: 0,
        costPrice: 0,
        sellingPrice: 0,
        barcode: '',
        status: 'active'
      });
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      await itemsAPI.delete(itemToDelete._id);
      toast.success('Item deleted successfully');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setDeleteReason('');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
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
          itemsAPI.update(id, { status: 'active' })
        ));
        toast.success(`${selectedItems.length} items activated`);
      } else if (bulkAction === 'deactivate') {
        await Promise.all(selectedItems.map(id => 
          itemsAPI.update(id, { status: 'inactive' })
        ));
        toast.success(`${selectedItems.length} items deactivated`);
      } else if (bulkAction === 'export') {
        // Export selected items to CSV
        const selectedItemsData = items.filter(item => selectedItems.includes(item._id));
        exportItemsToCSV(selectedItemsData);
      }

      setSelectedItems([]);
      setBulkAction('');
      fetchItems();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const exportItemsToCSV = (itemsToExport) => {
    const csvContent = [
      ['Name', 'HSN Code', 'Rate', 'Tax Slab', 'Units', 'Category', 'Stock', 'Status'],
      ...itemsToExport.map(item => [
        item.name,
        item.hsnCode || '',
        item.rate || 0,
        item.taxSlab || 0,
        item.units || 'per piece',
        item.category || '',
        item.quantityInStock || 0,
        item.status || 'active'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `items_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Items exported successfully');
  };

  const getStockStatus = (item) => {
    const stock = item.quantityInStock || 0;
    const minStock = item.minStock || 0;
    
    if (stock === 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= minStock) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

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
          <h1 className="text-3xl font-bold text-gray-900">Item Management</h1>
          <p className="text-gray-600">Manage your products and services</p>
        </div>
        <button
          onClick={() => setShowNewItem(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          New Item
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600">Total Items</h3>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-green-600">Active Items</h3>
          <p className="text-2xl font-bold text-green-900">
            {items.filter(item => item.status === 'active').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-yellow-600">Low Stock</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {items.filter(item => {
              const stock = item.quantityInStock || 0;
              const minStock = item.minStock || 0;
              return stock <= minStock && stock > 0;
            }).length}
          </p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-red-600">Out of Stock</h3>
          <p className="text-2xl font-bold text-red-900">
            {items.filter(item => (item.quantityInStock || 0) === 0).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Level</label>
            <select
              value={filters.stockLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, stockLevel: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="adequate">Adequate Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
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
                <option value="export">Export</option>
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
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                HSN Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Status
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
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500">{item.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.hsnCode || 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.rate || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantityInStock || 0} {item.units || 'pcs'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                      {stockStatus.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setCurrentItem({
                            name: item.name || '',
                            description: item.description || '',
                            hsnCode: item.hsnCode || '',
                            rate: item.rate || 0,
                            taxSlab: item.taxSlab || 18,
                            units: item.units || 'per piece',
                            category: item.category || '',
                            minStock: item.minStock || 0,
                            maxStock: item.maxStock || 0,
                            currentStock: item.quantityInStock || 0,
                            costPrice: item.costPrice || 0,
                            sellingPrice: item.sellingPrice || 0,
                            barcode: item.barcode || '',
                            status: item.status || 'active'
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
                        onClick={() => handleDeleteItem(item)}
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
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingItem ? 'Edit Item' : 'New Item'}
              </h3>
              <button
                onClick={() => {
                  setShowNewItem(false);
                  setEditingItem(null);
                  setCurrentItem({
                    name: '',
                    description: '',
                    hsnCode: '',
                    rate: 0,
                    taxSlab: 18,
                    units: 'per piece',
                    category: '',
                    minStock: 0,
                    maxStock: 0,
                    currentStock: 0,
                    costPrice: 0,
                    sellingPrice: 0,
                    barcode: '',
                    status: 'active'
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={currentItem.name}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter item name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={currentItem.hsnCode}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, hsnCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter HSN code"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={currentItem.description}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter item description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentItem.rate}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Slab (%)</label>
                  <input
                    type="number"
                    value={currentItem.taxSlab}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, taxSlab: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                  <select
                    value={currentItem.units}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, units: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="per piece">Per Piece</option>
                    <option value="kg">Kg</option>
                    <option value="gram">Gram</option>
                    <option value="litre">Litre</option>
                    <option value="meter">Meter</option>
                    <option value="box">Box</option>
                    <option value="set">Set</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={currentItem.category}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={currentItem.status}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={currentItem.currentStock}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, currentStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={currentItem.minStock}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, minStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                  <input
                    type="number"
                    value={currentItem.maxStock}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, maxStock: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewItem(false);
                    setEditingItem(null);
                    setCurrentItem({
                      name: '',
                      description: '',
                      hsnCode: '',
                      rate: 0,
                      taxSlab: 18,
                      units: 'per piece',
                      category: '',
                      minStock: 0,
                      maxStock: 0,
                      currentStock: 0,
                      costPrice: 0,
                      sellingPrice: 0,
                      barcode: '',
                      status: 'active'
                    });
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Delete Item</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
                </p>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion (optional)</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter reason for deletion..."
                  />
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setItemToDelete(null);
                      setDeleteReason('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteItem}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedItemManagement;
