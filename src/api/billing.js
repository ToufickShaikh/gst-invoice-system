import axios from 'axios';

// Correctly access the environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://gst-invoice-system-back.onrender.com/api';

// Optional: A debug line to confirm the URL is loaded correctly
console.log('API_BASE_URL:', API_BASE_URL);

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

export const billingAPI = {
  updateInvoice: async (id, invoiceData) => {
    const res = await api.put(`/billing/invoices/${id}`, invoiceData);
    return res.data;
  },
  getDashboardStats: async (dateRange) => {
    const res = await api.get(`/billing/dashboard-stats`, { params: dateRange });
    return res.data;
  },
  createInvoice: async (invoiceData) => {
    const res = await api.post(`/billing/invoices`, invoiceData);
    return res.data;
  },
  // Function to fetch all invoices, with an optional filter for billing type (B2B/B2C)
  getInvoices: async (billingType) => {
    console.log('Fetching invoices with type:', billingType);
    const response = await api.get(`/billing/invoices`, {
      params: { billingType },
    });
    return response.data;
  },
  // Get a single invoice by ID
  getInvoiceById: async (id) => {
    const res = await api.get(`/billing/invoices/${id}`);
    return res.data;
  },
  reprintInvoice: async (id) => {
    const res = await api.post(`/billing/invoices/${id}/reprint`);
    return res.data;
  },
  // Generate payment QR code
  generatePaymentQr: async (id) => {
    const res = await api.get(`/billing/invoices/${id}/payment-qr`);
    return res.data;
  },
  // Delete an invoice by ID
  deleteInvoice: async (id) => {
    const res = await api.delete(`/billing/invoices/${id}`);
    return res.data;
  },
};