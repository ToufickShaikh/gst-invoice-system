import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gst-invoice-system-back.onrender.com/api';

console.log('API_BASE_URL:', import.meta.env.VITE_API_URL); // DEBUG LINE

export const billingAPI = {
  updateInvoice: async (id, invoiceData) => {
    const res = await axios.put(`${API_BASE_URL}/billing/invoices/${id}`, invoiceData);
    return res.data;
  },
  getDashboardStats: async () => {
    const res = await axios.get(`${API_BASE_URL}/billing/dashboard-stats`);
    return res.data;
  },
  createInvoice: async (invoiceData) => {
    const res = await axios.post(`${API_BASE_URL}/billing/invoices`, invoiceData);
    return res.data;
  },
  getInvoices: async (billingType) => {
    const res = await axios.get(`${API_BASE_URL}/billing`, { params: { billingType } });
    return res.data;
  },
  getInvoiceById: async (id) => {
    const res = await axios.get(`${API_BASE_URL}/billing/invoices/${id}`);
    return res.data;
  },
  reprintInvoice: async (id) => {
    const res = await axios.post(`${API_BASE_URL}/billing/invoices/${id}/reprint`);
    return res.data;
  }
};