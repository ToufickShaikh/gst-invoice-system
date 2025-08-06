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
    { key: 'supplier.name', label: 'Supplier' },
    { key: 'purchaseDate', label: 'Date' },
    {
      key: 'actions',
      label: 'Actions',
      render: (purchase) => (
        <div className="flex space-x-2">
          <Button onClick={() => handleEdit(purchase)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(purchase._id)}>
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
      const response = await itemsAPI.getAllItems();
      console.log('Items fetched successfully:', response);
      setItems(response);
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
      if (isEditMode) {
        await purchasesAPI.updatePurchase(currentPurchaseId, formData);
        toast.success('Purchase updated successfully');
      } else {
        await purchasesAPI.createPurchase(formData);
        // Update inventory stock for each item
        for (const item of formData.items) {
          const found = items.find(i => i._id === item.item);
          if (found) {
            const newStock = (found.stock ?? 0) + parseInt(item.quantity);
            await itemsAPI.update(item.item, { ...found, stock: newStock });
          }
        }
        toast.success('Purchase created successfully');
      }
      fetchPurchases();
      setIsModalOpen(false);
      setIsEditMode(false);
      setCurrentPurchaseId(null);
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} purchase`);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Purchases</h1>
          <Button onClick={() => {
            setIsEditMode(false);
            setFormData({ supplier: '', items: [], notes: '' });
            setIsModalOpen(true);
          }}>Add Purchase</Button>
        </div>
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
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

            <div>
              <h3 className="text-lg font-medium">Items</h3>
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-4 items-center mt-2">
                  <select
                    value={item.item}
                    onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="">Select an item</option>
                    {items.map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <InputField
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', e.target.value)
                    }
                    required
                  />
                  <InputField
                    label="Purchase Price"
                    type="number"
                    value={item.purchasePrice}
                    onChange={(e) =>
                      handleItemChange(index, 'purchasePrice', e.target.value)
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleRemoveItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={handleAddItem} className="mt-2">
                Add Item
              </Button>
            </div>
            <InputField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
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