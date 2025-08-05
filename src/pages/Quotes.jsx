
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { billingAPI } from '../api/billing';
import { customersAPI } from '../api/customers';

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
  });
  const [customers, setCustomers] = useState([]);
  const [editingQuoteId, setEditingQuoteId] = useState(null);

  const columns = [
    { key: 'customer', label: 'Customer' },
    { key: 'quoteDate', label: 'Date' },
    { key: 'status', label: 'Status' },
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
      const response = await customersAPI.getAllCustomers();
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchCustomers();
  }, []);

  const handleOpenModal = () => {
    setIsEditMode(false);
    setFormData({ customer: '', quoteDate: '', status: 'Draft', notes: '' });
    setIsModalOpen(true);
    setEditingQuoteId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ customer: '', quoteDate: '', status: 'Draft', notes: '' });
    setEditingQuoteId(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.quoteDate) {
      toast.error('Customer and Date are required');
      return;
    }
    try {
      if (isEditMode && editingQuoteId) {
        await billingAPI.updateQuote(editingQuoteId, formData);
        toast.success('Quote updated');
      } else {
        await billingAPI.createQuote(formData);
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
                  <option key={c._id} value={c._id}>{c.name}</option>
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
            <InputField
              label="Status"
              name="status"
              type="text"
              value={formData.status}
              onChange={handleChange}
            />
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
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Quotes;
