import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';
import { formatCurrency } from '../utils/dateHelpers';
import AdvancedInvoicePrint from './AdvancedInvoicePrint';

const EnhancedBillingForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: null,
    items: [],
    discountType: 'percentage', // 'percentage' or 'amount'
    discountValue: 0,
    shippingCharges: 0,
    notes: '',
    termsAndConditions: '',
    paymentTerms: '30', // days
    dueDate: '',
    status: 'draft' // draft, pending, paid, overdue
  });

  const [customers, setCustomers] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [autoCalculate, setAutoCalculate] = useState(true);

  // Customer form data
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    type: 'B2B'
  });

  // Item form data
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    hsnCode: '',
    unit: 'pcs',
    sellingPrice: 0,
    taxRate: 18
  });

  // Invoice item data
  const [currentItem, setCurrentItem] = useState({
    item: '',
    name: '',
    description: '',
    hsnCode: '',
    quantity: 1,
    rate: 0,
    discount: 0,
    taxRate: 18,
    amount: 0
  });

  // Enhanced item management states
  const [selectedItems, setSelectedItems] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [bulkItemAction, setBulkItemAction] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    setFormData(prev => ({
      ...prev,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  }, []);

  useEffect(() => {
    if (autoCalculate) {
      calculateTotals();
    }
  }, [formData.items, formData.discountValue, formData.shippingCharges, autoCalculate]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      // Handle different response structures
      const customersArray = Array.isArray(response) 
        ? response 
        : (Array.isArray(response.data) ? response.data : response.customers || []);
      setCustomers(customersArray);
      console.log('✅ Customers loaded:', customersArray.length);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      // Handle different response structures - match working Items.jsx pattern
      const itemsArray = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response) ? response : []);
      
      // Filter out null/undefined items and format for billing
      const formattedItems = itemsArray
        .filter(item => item != null)
        .map(item => ({
          ...item,
          sellingPrice: item.rate || 0, // Map rate to sellingPrice for backward compatibility
          quantityInStock: item.quantityInStock ?? 0
        }));
      
      setAvailableItems(formattedItems);
      console.log('✅ Items loaded:', formattedItems.length);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    }
  };

  const calculateItemAmount = (item) => {
    const baseAmount = item.quantity * item.rate;
    const discountAmount = (baseAmount * item.discount) / 100;
    const discountedAmount = baseAmount - discountAmount;
    const taxAmount = (discountedAmount * item.taxRate) / 100;
    return discountedAmount + taxAmount;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.rate;
      const discountAmount = (baseAmount * item.discount) / 100;
      return sum + (baseAmount - discountAmount);
    }, 0);

    const totalTax = formData.items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.rate;
      const discountAmount = (baseAmount * item.discount) / 100;
      const discountedAmount = baseAmount - discountAmount;
      return sum + (discountedAmount * item.taxRate) / 100;
    }, 0);

    let discountAmount = 0;
    if (formData.discountType === 'percentage') {
      discountAmount = (subtotal * formData.discountValue) / 100;
    } else {
      discountAmount = formData.discountValue;
    }

    const finalSubtotal = subtotal - discountAmount;
    const total = finalSubtotal + totalTax + formData.shippingCharges;

    return {
      subtotal: subtotal,
      discountAmount: discountAmount,
      taxAmount: totalTax,
      total: total
    };
  };

  const addItemToInvoice = () => {
    if (!currentItem.name || currentItem.quantity <= 0 || currentItem.rate <= 0) {
      toast.error('Please fill all required item fields');
      return;
    }

    const itemWithAmount = {
      ...currentItem,
      id: Date.now(),
      amount: calculateItemAmount(currentItem)
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, itemWithAmount]
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
      amount: 0
    });

    toast.success('Item added to invoice');
  };

  const removeItemFromInvoice = (itemId) => {
    const item = formData.items.find(item => item.id === itemId);
    if (item) {
      setItemToDelete(item);
      setShowDeleteConfirm(true);
    }
  };

  const confirmRemoveItem = () => {
    if (itemToDelete) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemToDelete.id)
      }));
      toast.success('Item removed from invoice');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const handleBulkItemAction = () => {
    if (!bulkItemAction || selectedItems.length === 0) {
      toast.error('Please select items and action');
      return;
    }

    if (bulkItemAction === 'delete') {
      if (window.confirm(`Remove ${selectedItems.length} items from invoice?`)) {
        setFormData(prev => ({
          ...prev,
          items: prev.items.filter(item => !selectedItems.includes(item.id))
        }));
        toast.success(`${selectedItems.length} items removed from invoice`);
        setSelectedItems([]);
        setBulkItemAction('');
      }
    } else if (bulkItemAction === 'duplicate') {
      const itemsToDuplicate = formData.items.filter(item => selectedItems.includes(item.id));
      const duplicatedItems = itemsToDuplicate.map(item => ({
        ...item,
        id: Date.now() + Math.random(),
        name: `${item.name} (Copy)`
      }));
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, ...duplicatedItems]
      }));
      toast.success(`${selectedItems.length} items duplicated`);
      setSelectedItems([]);
      setBulkItemAction('');
    }
  };

  const updateInvoiceItem = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          return {
            ...updatedItem,
            amount: calculateItemAmount(updatedItem)
          };
        }
        return item;
      })
    }));
  };

  const selectExistingItem = (item) => {
    console.log('🔄 Selecting existing item:', item);
    setCurrentItem({
      item: item._id,
      name: item.name,
      description: item.description || '',
      hsnCode: item.hsnCode || '',
      quantity: 1,
      rate: item.sellingPrice || item.rate || 0,
      discount: 0,
      taxRate: item.taxSlab || item.taxRate || 18,
      amount: 0
    });
    toast.success(`Selected: ${item.name}`);
  };

  const createCustomer = async () => {
    try {
      await customersAPI.createCustomer(newCustomer);
      toast.success('Customer created successfully');
      setShowCustomerForm(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        gstin: '',
        type: 'B2B'
      });
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const createItem = async () => {
    try {
      await itemsAPI.createItem(newItem);
      toast.success('Item created successfully');
      setShowItemForm(false);
      setNewItem({
        name: '',
        description: '',
        hsnCode: '',
        unit: 'pcs',
        sellingPrice: 0,
        taxRate: 18
      });
      fetchItems();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    }
  };

  const saveInvoice = async (status = 'draft') => {
    if (!formData.customer) {
      toast.error('Please select a customer');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      const totals = calculateTotals();
      const invoiceData = {
        customerId: formData.customer._id,
        customer: formData.customer,
        items: formData.items,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        shippingCharges: formData.shippingCharges,
        total: totals.total,
        notes: formData.notes,
        termsAndConditions: formData.termsAndConditions,
        paymentTerms: formData.paymentTerms,
        dueDate: formData.dueDate,
        status: status,
        date: new Date().toISOString()
      };

      const response = await billingAPI.createInvoice(invoiceData);
      setCurrentInvoice(response.invoice);
      
      toast.success(`Invoice ${status === 'draft' ? 'saved as draft' : 'created'} successfully!`);
      
      if (status !== 'draft') {
        setShowPrintModal(true);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Debug identifier - Enhanced Version */}
      <div className="hidden" id="enhanced-billing-form-v2.0" data-version="enhanced"></div>
      
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 Enhanced Invoice Creation</h1>
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">v2.0 Enhanced</span>
        </div>
        <p className="text-gray-600">Professional billing with real-time calculations, bulk operations, and advanced features</p>
      </div>

      {/* Customer Selection */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
          <button
            onClick={() => setShowCustomerForm(!showCustomerForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add New Customer
          </button>
        </div>

        {showCustomerForm && (
          <div className="mb-6 p-4 border rounded-lg bg-white">
            <h3 className="text-lg font-medium mb-4">New Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Customer Name *"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="GSTIN"
                value={newCustomer.gstin}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, gstin: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Address *"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                rows="2"
              />
              <select
                value={newCustomer.type}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={createCustomer}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create Customer
              </button>
              <button
                onClick={() => setShowCustomerForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <select
          value={formData.customer?._id || ''}
          onChange={(e) => {
            const customer = customers.find(c => c._id === e.target.value);
            setFormData(prev => ({ ...prev, customer }));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Customer</option>
          {customers.map(customer => (
            <option key={customer._id} value={customer._id}>
              {customer.name} - {customer.phone}
            </option>
          ))}
        </select>

        {formData.customer && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Selected Customer</h3>
            <p className="text-blue-800">{formData.customer.name}</p>
            <p className="text-blue-700 text-sm">{formData.customer.address}</p>
            <p className="text-blue-700 text-sm">{formData.customer.phone} | {formData.customer.email}</p>
            {formData.customer.gstin && (
              <p className="text-blue-700 text-sm">GSTIN: {formData.customer.gstin}</p>
            )}
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Invoice Items</h2>
          <button
            onClick={() => setShowItemForm(!showItemForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            + Add New Item
          </button>
        </div>

        {showItemForm && (
          <div className="mb-6 p-4 border rounded-lg bg-white">
            <h3 className="text-lg font-medium mb-4">New Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Item Name *"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="HSN Code"
                value={newItem.hsnCode}
                onChange={(e) => setNewItem(prev => ({ ...prev, hsnCode: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Unit (pcs, kg, etc.)"
                value={newItem.unit}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Selling Price *"
                value={newItem.sellingPrice}
                onChange={(e) => setNewItem(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Tax Rate (%)"
                value={newItem.taxRate}
                onChange={(e) => setNewItem(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-3"
                rows="2"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={createItem}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create Item
              </button>
              <button
                onClick={() => setShowItemForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Item to Invoice */}
        <div className="mb-6 p-4 border rounded-lg bg-white">
          <h3 className="text-lg font-medium mb-4">Add Item to Invoice</h3>
          
          {/* Select from existing items */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select from existing items
            </label>
            <select
              onChange={(e) => {
                const item = availableItems.find(i => i._id === e.target.value);
                if (item) {
                  console.log('✅ Selected item:', item);
                  selectExistingItem(item);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an existing item... ({availableItems.length} available)</option>
              {availableItems.map(item => (
                <option key={item._id} value={item._id}>
                  {item.name} - {formatCurrency(item.sellingPrice || item.rate || 0)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Item Name *"
                value={currentItem.name}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="number"
              placeholder="Qty *"
              value={currentItem.quantity}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Rate *"
              value={currentItem.rate}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Disc %"
              value={currentItem.discount}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Tax %"
              value={currentItem.taxRate}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input
              type="text"
              placeholder="HSN Code"
              value={currentItem.hsnCode}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, hsnCode: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">
                Amount: {formatCurrency(calculateItemAmount(currentItem))}
              </span>
              <button
                onClick={addItemToInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Items List */}
        {formData.items.length > 0 && (
          <div className="bg-white rounded-lg border overflow-hidden">
            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="bg-blue-50 p-4 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {selectedItems.length} item(s) selected
                  </span>
                  <div className="flex items-center space-x-3">
                    <select
                      value={bulkItemAction}
                      onChange={(e) => setBulkItemAction(e.target.value)}
                      className="px-3 py-1 border border-blue-300 rounded-md text-sm"
                    >
                      <option value="">Select Action</option>
                      <option value="duplicate">Duplicate Items</option>
                      <option value="delete">Remove Items</option>
                    </select>
                    <button
                      onClick={handleBulkItemAction}
                      className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === formData.items.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(formData.items.map(item => item.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disc%</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax%</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.items.map((item) => (
                    <tr key={item.id} className={selectedItems.includes(item.id) ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => [...prev, item.id]);
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item.id));
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateInvoiceItem(item.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => updateInvoiceItem(item.id, 'hsnCode', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateInvoiceItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateInvoiceItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateInvoiceItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={() => removeItemFromInvoice(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Totals and Additional Charges */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additional Charges */}
        <div className="p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Charges & Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
              <div className="flex gap-2">
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">%</option>
                  <option value="amount">₹</option>
                </select>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Discount"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Charges</label>
              <input
                type="number"
                value={formData.shippingCharges}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Shipping charges"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment terms in days"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Invoice Totals */}
        <div className="p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Invoice Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-blue-800">Subtotal:</span>
              <span className="font-medium text-blue-900">{formatCurrency(totals.subtotal)}</span>
            </div>
            
            {totals.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-blue-800">Discount:</span>
                <span className="font-medium text-red-600">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-blue-800">Tax Amount:</span>
              <span className="font-medium text-blue-900">{formatCurrency(totals.taxAmount)}</span>
            </div>
            
            {formData.shippingCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-blue-800">Shipping:</span>
                <span className="font-medium text-blue-900">{formatCurrency(formData.shippingCharges)}</span>
              </div>
            )}
            
            <div className="border-t border-blue-200 pt-3">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-blue-900">Total:</span>
                <span className="text-lg font-bold text-blue-900">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center text-sm text-blue-800">
              <input
                type="checkbox"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Auto-calculate totals
            </label>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Internal notes (not visible on invoice)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
          <textarea
            value={formData.termsAndConditions}
            onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Terms and conditions (visible on invoice)"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <button
          onClick={() => saveInvoice('draft')}
          disabled={loading}
          className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save as Draft'}
        </button>
        
        <button
          onClick={() => saveInvoice('pending')}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
        
        <button
          onClick={() => navigate('/invoices')}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Remove Item</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove "{itemToDelete.name}" from this invoice?
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600">
                    <p>Quantity: {itemToDelete.quantity}</p>
                    <p>Rate: {formatCurrency(itemToDelete.rate)}</p>
                    <p>Amount: {formatCurrency(itemToDelete.amount)}</p>
                  </div>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setItemToDelete(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRemoveItem}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && currentInvoice && (
        <AdvancedInvoicePrint
          invoice={currentInvoice}
          isVisible={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            navigate('/invoices');
          }}
        />
      )}
    </div>
  );
};

export default EnhancedBillingForm;
