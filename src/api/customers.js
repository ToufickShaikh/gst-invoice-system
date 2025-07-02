// frontend/src/api/customers.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://gst-invoice-system-back.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customersAPI = {
  getAll: async (customerType) => {
    const params = customerType ? { customerType } : {};
    const res = await api.get(`/customers`, { params });
    return res.data;
  },
  create: async (customer) => {
    const res = await api.post(`/customers`, customer);
    return res.data;
  },
  update: async (id, customer) => {
    const res = await api.put(`/customers/${id}`, customer);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
};