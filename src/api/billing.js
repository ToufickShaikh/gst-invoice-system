import axios from 'axios';

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
};