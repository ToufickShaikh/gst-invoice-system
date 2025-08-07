import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { purchasesAPI } from '../api/purchases';
import { suppliersAPI } from '../api/suppliers';
import { itemsAPI } from '../api/items';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPurchaseId, setCurrentPurchaseId] = useState(null);
  const [formData, setFormData] = useState({
    supplier: '',
    items: [],
    notes: '',
  });

  const columns = [
    { 
      key: 'purchaseNumber', 
      label: 'Purchase #',
      render: (purchase) => `PUR-${purchase._id.slice(-6).toUpperCase()}`
    },
    { 
      key: 'supplier.name', 
      label: 'Supplier',
      render: (purchase) => purchase.supplier?.name || 'Unknown Supplier'
    },
    { 
      key: 'purchaseDate', 
      label: 'Date',
      render: (purchase) => new Date(purchase.purchaseDate).toLocaleDateString()
    },
    {
      key: 'itemsCount',
      label: 'Items',
      render: (purchase) => (
        <div>
          <span className="font-semibold">{purchase.items?.length || 0} items</span>
          <div className="text-xs text-gray-500 mt-1">
            {purchase.items?.map(item => item.item?.name || 'Unknown Item').join(', ').substring(0, 50)}
            {purchase.items?.map(item => item.item?.name || 'Unknown Item').join(', ').length > 50 && '...'}
          </div>
        </div>
      )
    },
    {
      key: 'totalQuantity',
      label: 'Total Qty',
      render: (purchase) => (
        <span className="font-semibold text-blue-600">
          {purchase.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
        </span>
      )
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      render: (purchase) => {
        const total = purchase.items?.reduce((sum, item) => 
          sum + ((item.quantity || 0) * (item.purchasePrice || 0)), 0) || 0;
        return (
          <span className="font-semibold text-green-600">
            ₹{total.toFixed(2)}
          </span>
        );
      }
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (purchase) => (
        <span className="text-sm text-gray-600">
          {purchase.notes ? (purchase.notes.length > 30 ? purchase.notes.substring(0, 30) + '...' : purchase.notes) : 'No notes'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (purchase) => (
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            onClick={() => handleEdit(purchase)}
            className="text-xs"
          >
            Edit
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => handleDelete(purchase._id)}
            className="text-xs"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await purchasesAPI.getAllPurchases();
      setPurchases(response);
    } catch (error) {
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response);
    } catch (error) {
      toast.error('Failed to fetch suppliers');
    }
  };

  const fetchItems = async () => {
    console.log('Attempting to fetch items...');
    console.log('itemsAPI object:', itemsAPI);
    try {
      const response = await itemsAPI.getAll(); // Changed from getAllItems() to getAll()
      console.log('Items fetched successfully:', response);
      // Ensure consistent stock property mapping
      const itemsWithStock = Array.isArray(response.data) 
        ? response.data.map(item => ({ ...item, stock: item.quantityInStock ?? 0 }))
        : (Array.isArray(response) 
          ? response.map(item => ({ ...item, stock: item.quantityInStock ?? 0 }))
          : []);
      setItems(itemsWithStock);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    }
  };

  useEffect(() => {
    console.log('Purchases component mounted. Fetching initial data...');
    fetchPurchases();
    fetchSuppliers();
    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: '', quantity: 1, purchasePrice: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleEdit = (purchase) => {
    setIsEditMode(true);
    setCurrentPurchaseId(purchase._id);
    setFormData({
      supplier: purchase.supplier._id,
      items: purchase.items.map((item) => ({
        item: item.item._id,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
      })),
      notes: purchase.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await purchasesAPI.deletePurchase(id);
        toast.success('Purchase deleted successfully');
        fetchPurchases();
      } catch (error) {
        toast.error('Failed to delete purchase');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate supplier
    if (!formData.supplier) {
      toast.error('Supplier is required');
      return;
    }
    // Validate items
    if (!formData.items.length) {
      toast.error('At least one item is required');
      return;
    }
    for (const item of formData.items) {
      if (!item.item || !item.quantity || !item.purchasePrice) {
        toast.error('All item fields are required');
        return;
      }
      if (parseInt(item.quantity) <= 0) {
        toast.error('Quantity must be greater than zero');
        return;
      }
      if (parseFloat(item.purchasePrice) < 0) {
        toast.error('Purchase price must be zero or greater');
        return;
      }
    }
    try {
      // Convert string values to numbers before sending
      const processedFormData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseInt(item.quantity),
          purchasePrice: parseFloat(item.purchasePrice)
        }))
      };
      
      console.log('Submitting purchase data:', processedFormData);
      if (isEditMode) {
        await purchasesAPI.updatePurchase(currentPurchaseId, processedFormData);
        toast.success('Purchase updated successfully');
      } else {
        const result = await purchasesAPI.createPurchase(processedFormData);
        console.log('Purchase created successfully:', result);
        // Backend automatically updates stock for purchases
        toast.success('Purchase created successfully');
      }
      fetchPurchases();
      fetchItems(); // Refresh items to show updated stock
      setIsModalOpen(false);
      setIsEditMode(false);
      setCurrentPurchaseId(null);
      // Reset form data
      setFormData({ 
        supplier: '', 
        items: [{ item: '', quantity: 1, purchasePrice: 0 }], 
        notes: '' 
      });
    } catch (error) {
      console.error('Purchase operation error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} purchase: ${errorMessage}`);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <Button onClick={() => {
            setIsEditMode(false);
            setFormData({ 
              supplier: '', 
              items: [{ item: '', quantity: 1, purchasePrice: 0 }], // Initialize with one empty item
              notes: '' 
            });
            setIsModalOpen(true);
          }}>
            + Add Purchase
          </Button>
        </div>

        {/* Purchase Statistics */}
        {purchases.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                  <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {purchases.reduce((sum, purchase) => sum + (purchase.items?.length || 0), 0)}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {purchases.reduce((sum, purchase) => 
                      sum + (purchase.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0)}
                  </p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{purchases.reduce((sum, purchase) => 
                      sum + (purchase.items?.reduce((itemSum, item) => 
                        itemSum + ((item.quantity || 0) * (item.purchasePrice || 0)), 0) || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchases Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading purchases...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No purchases yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first purchase order.</p>
              <div className="mt-6">
                <Button onClick={() => {
                  setIsEditMode(false);
                  setFormData({ 
                    supplier: '', 
                    items: [{ item: '', quantity: 1, purchasePrice: 0 }], 
                    notes: '' 
                  });
                  setIsModalOpen(true);
                }}>
                  + Add Purchase
                </Button>
              </div>
            </div>
          ) : (
            <Table columns={columns} data={purchases} />
          )}
        </div>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditMode ? 'Edit Purchase' : 'Add Purchase'}
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">Supplier</label>
              <select
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Items</h3>
              {formData.items.map((item, index) => {
                const selectedItem = items.find(i => i._id === item.item);
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Item {index + 1}</h4>
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-xs"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item
                        </label>
                        <select
                          value={item.item}
                          onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        >
                          <option value="">Select an item</option>
                          {items.map((i) => (
                            <option key={i._id} value={i._id}>
                              {i.name} (HSN: {i.hsnCode})
                            </option>
                          ))}
                        </select>
                        {selectedItem && (
                          <div className="mt-2 text-xs text-gray-600">
                            <p>Current Stock: <span className={`font-semibold ${selectedItem.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                              {selectedItem.stock || 0} {selectedItem.units}
                            </span></p>
                            <p>Rate: ₹{selectedItem.rate}</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                        {selectedItem && (
                          <div className="mt-1 text-xs text-gray-500">
                            Units: {selectedItem.units}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Purchase Price (per unit)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.purchasePrice}
                          onChange={(e) => handleItemChange(index, 'purchasePrice', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                        {item.quantity && item.purchasePrice && (
                          <div className="mt-1 text-xs text-green-600 font-medium">
                            Total: ₹{(parseFloat(item.quantity) * parseFloat(item.purchasePrice)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <Button 
                type="button" 
                onClick={handleAddItem} 
                className="mt-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                + Add Another Item
              </Button>
              
              {/* Purchase Summary */}
              {formData.items.some(item => item.quantity && item.purchasePrice) && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Purchase Summary</h4>
                  <div className="text-sm text-green-700">
                    <p>Total Items: {formData.items.filter(item => item.item && item.quantity).length}</p>
                    <p>Total Quantity: {formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)}</p>
                    <p className="font-semibold">Total Amount: ₹{formData.items.reduce((sum, item) => 
                      sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.purchasePrice) || 0)), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <InputField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any notes about this purchase..."
            />
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {isEditMode ? 'Update Purchase' : 'Add Purchase'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Purchases;