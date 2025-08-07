

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { billingAPI } from '../api/billing';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    quoteDate: '',
    status: 'Draft',
    notes: '',
    items: [],
  });
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [editingQuoteId, setEditingQuoteId] = useState(null);

  const columns = [
    { key: 'customer', label: 'Customer' },
    { key: 'quoteDate', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total' },
    {
      key: 'actions',
      label: 'Actions',
      render: (quote) => (
        <div className="flex space-x-2">
          <Button onClick={() => handleEdit(quote)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(quote._id)}>Delete</Button>
        </div>
      ),
    },
  ];

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await billingAPI.getAllQuotes();
      setQuotes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(Array.isArray(response) ? response : response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      const itemsArray = Array.isArray(response.data) ? response.data : response;
      // Map quantityInStock to stock for consistency
      const itemsWithStock = itemsArray.map(item => ({
        ...item,
        stock: item.quantityInStock ?? 0
      }));
      setItems(itemsWithStock);
    } catch (error) {
      toast.error('Failed to fetch items');
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchCustomers();
    fetchItems();
  }, []);

  const handleOpenModal = () => {
    setIsEditMode(false);
    setFormData({ customer: '', quoteDate: '', status: 'Draft', notes: '', items: [] });
    setIsModalOpen(true);
    setEditingQuoteId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ customer: '', quoteDate: '', status: 'Draft', notes: '', items: [] });
    setEditingQuoteId(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item: '', quantity: 1, rate: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.rate || 0) * parseInt(item.quantity || 0)), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.quoteDate) {
      toast.error('Customer and Date are required');
      return;
    }
    if (!formData.items.length) {
      toast.error('At least one item is required');
      return;
    }
    for (const item of formData.items) {
      if (!item.item || !item.quantity || !item.rate) {
        toast.error('All item fields are required');
        return;
      }
      if (parseInt(item.quantity) <= 0) {
        toast.error('Quantity must be greater than zero');
        return;
      }
      if (parseFloat(item.rate) < 0) {
        toast.error('Rate must be zero or greater');
        return;
      }
    }
    try {
      const payload = { ...formData, total: calculateTotal() };
      if (isEditMode && editingQuoteId) {
        await billingAPI.updateQuote(editingQuoteId, payload);
        toast.success('Quote updated');
      } else {
        await billingAPI.createQuote(payload);
        toast.success('Quote added');
      }
      fetchQuotes();
      handleCloseModal();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleEdit = (quote) => {
    setIsEditMode(true);
    setEditingQuoteId(quote._id);
    setFormData({
      customer: quote.customer._id || '',
      quoteDate: quote.quoteDate || '',
      status: quote.status || 'Draft',
      notes: quote.notes || '',
      items: quote.items || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this quote?')) {
      try {
        await billingAPI.deleteQuote(id);
        toast.success('Quote deleted');
        fetchQuotes();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const data = quotes.map((quote) => ({
    ...quote,
    customer: quote.customer?.name || '',
    total: quote.total || (quote.items ? quote.items.reduce((sum, item) => sum + (parseFloat(item.rate || 0) * parseInt(item.quantity || 0)), 0) : 0),
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quotes</h1>
          <Button onClick={handleOpenModal}>Add Quote</Button>
        </div>
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table columns={columns} data={data} />
          )}
        </div>
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? 'Edit Quote' : 'Add Quote'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Customer</label>
              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>{c.name || c.firmName}</option>
                ))}
              </select>
            </div>
            <InputField
              label="Quote Date"
              name="quoteDate"
              type="date"
              value={formData.quoteDate}
              onChange={handleChange}
              required
            />
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
                      <option key={i._id} value={i._id}>{i.name}</option>
                    ))}
                  </select>
                  <InputField
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    required
                  />
                  <InputField
                    label="Rate"
                    type="number"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    required
                  />
                  <Button type="button" variant="danger" onClick={() => handleRemoveItem(index)}>Remove</Button>
                </div>
              ))}
              <Button type="button" onClick={handleAddItem} className="mt-2">Add Item</Button>
            </div>
            <InputField
              label="Notes"
              name="notes"
              type="text"
              value={formData.notes}
              onChange={handleChange}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit">{isEditMode ? 'Update' : 'Add'}</Button>
            </div>
            <div className="mt-4 text-right text-lg font-bold text-blue-700">Total: ₹{calculateTotal()}</div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Quotes;
