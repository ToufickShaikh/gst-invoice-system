import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    items: [],
    notes: '',
  });

  const columns = [
    { key: 'supplier', label: 'Supplier' },
    { key: 'purchaseDate', label: 'Date' },
    { key: 'items', label: 'Items' },
    { key: 'notes', label: 'Notes' },
  ];

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await billingAPI.getAllPurchases();
      setPurchases(response.data);
    } catch (error) {
      toast.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await billingAPI.createPurchase(formData);
      toast.success('Purchase created successfully');
      fetchPurchases();
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to create purchase');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Purchases</h1>
          <Button onClick={() => setIsModalOpen(true)}>Add Purchase</Button>
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
          title="Add Purchase"
        >
          <form onSubmit={handleSubmit}>
            <InputField
              label="Supplier"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              required
            />
            <div>
              <h3 className="text-lg font-medium">Items</h3>
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-4 items-center mt-2">
                  <InputField
                    label="Item"
                    value={item.item}
                    onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                    required
                  />
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
                Add Purchase
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Purchases;
