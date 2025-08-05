
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { salesOrdersAPI } from '../api/salesOrders';
import { customersAPI } from '../api/customers';

const SalesOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    orderDate: '',
    status: 'Draft',
    notes: '',
  });
  const [customers, setCustomers] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const columns = [
    { key: 'customer', label: 'Customer' },
    { key: 'orderDate', label: 'Date' },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Actions',
      render: (order) => (
        <div className="flex space-x-2">
          <Button onClick={() => handleEdit(order)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(order._id)}>Delete</Button>
        </div>
      ),
    },
  ];

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await salesOrdersAPI.getAll();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch sales orders');
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
    fetchOrders();
    fetchCustomers();
  }, []);

  const handleOpenModal = () => {
    setIsEditMode(false);
    setFormData({ customer: '', orderDate: '', status: 'Draft', notes: '' });
    setIsModalOpen(true);
    setEditingOrderId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ customer: '', orderDate: '', status: 'Draft', notes: '' });
    setEditingOrderId(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer || !formData.orderDate) {
      toast.error('Customer and Date are required');
      return;
    }
    try {
      if (isEditMode && editingOrderId) {
        await salesOrdersAPI.update(editingOrderId, formData);
        toast.success('Sales order updated');
      } else {
        await salesOrdersAPI.create(formData);
        toast.success('Sales order added');
      }
      fetchOrders();
      handleCloseModal();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleEdit = (order) => {
    setIsEditMode(true);
    setEditingOrderId(order._id);
    setFormData({
      customer: order.customer._id || '',
      orderDate: order.orderDate || '',
      status: order.status || 'Draft',
      notes: order.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this sales order?')) {
      try {
        await salesOrdersAPI.delete(id);
        toast.success('Sales order deleted');
        fetchOrders();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const data = orders.map((order) => ({
    ...order,
    customer: order.customer?.name || '',
  }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Sales Orders</h1>
          <Button onClick={handleOpenModal}>New Sales Order</Button>
        </div>
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table columns={columns} data={data} />
          )}
        </div>
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? 'Edit Sales Order' : 'New Sales Order'}>
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
              label="Order Date"
              name="orderDate"
              type="date"
              value={formData.orderDate}
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

export default SalesOrders;