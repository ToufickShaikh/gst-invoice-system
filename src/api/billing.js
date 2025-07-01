import axios from 'axios';
const API_BASE_URL = 'http://localhost:3000/api';

// Example billing API functions
export const billingAPI = {
  getAll: async (billingType) => {
    const url = billingType ? `${API_BASE_URL}/billing?billingType=${billingType}` : `${API_BASE_URL}/billing`;
    const res = await axios.get(url);
    return res.data;
  },
  getById: async (id) => {
    const res = await axios.get(`${API_BASE_URL}/billing/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/billing/invoices`, data);
    return res.data;
  },
  getDashboardStats: async (dateRange) => {
    const res = await axios.post(`${API_BASE_URL}/billing/dashboard-stats`, dateRange);
    return res.data;
  },
  update: async (id, data) => {
    const res = await axios.put(`${API_BASE_URL}/billing/${id}`, data);
    return res.data;
  },
  remove: async (id) => {
    const res = await axios.delete(`${API_BASE_URL}/billing/${id}`);
    return res.data;
  },
};