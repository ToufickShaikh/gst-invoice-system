import axios from 'axios';

const API_BASE_URL = import.meta.env.import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gst-invoice-system-back.onrender.com/api';

export const billingAPI = {
  getDashboardStats: async () => {
    const res = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`);
    return res.data;
  },
  createInvoice: async (invoiceData) => {
    const res = await axios.post(`${API_BASE_URL}/billing/invoices`, invoiceData);
    return res.data;
  },
  getInvoices: async (billingType) => {
    const res = await axios.get(`${API_BASE_URL}/billing/invoices`, { params: { billingType } });
    return res.data;
  },
  getInvoiceById: async (id) => {
    const res = await axios.get(`${API_BASE_URL}/billing/invoices/${id}`);
    return res.data;
  }
}; || 'https://gst-invoice-system-back.onrender.com/api';

// Example auth API functions
export const authAPI = {
  login: async (credentials) => {
    // Map username to email for backend compatibility if needed
    const payload = credentials.username ? { username: credentials.username, password: credentials.password } : credentials;
    const res = await axios.post(`${API_BASE_URL}/auth/login`, payload);
    return res.data;
  },
  register: async (data) => {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, data);
    return res.data;
  },
  logout: async () => {
    const res = await axios.post(`${API_BASE_URL}/auth/logout`);
    return res.data;
  },
  getProfile: async () => {
    const res = await axios.get(`${API_BASE_URL}/auth/profile`);
    return res.data;
  },
};