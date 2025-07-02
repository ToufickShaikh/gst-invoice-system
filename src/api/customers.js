// frontend/src/api/customers.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gst-invoice-system-back.onrender.com/api';

export const customersAPI = {
  getAll: async (customerType) => {
    const params = customerType ? { customerType } : {};
    const res = await axios.get(`${API_BASE_URL}/customers`, { params });
    return res.data;
  },
  create: async (customer) => {
    const res = await axios.post(`${API_BASE_URL}/customers`, customer);
    return res.data;
  },
  update: async (id, customer) => {
    const res = await axios.put(`${API_BASE_URL}/customers/${id}`, customer);
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_BASE_URL}/customers/${id}`);
    return res.data;
  }
};