import axiosInstance from './axiosInstance';
import { invoicesAPI } from './invoices';

export const billingAPI = {
  // Legacy wrapper -> new v2
  updateInvoice: (id, invoiceData) => invoicesAPI.update(id, invoiceData),
  getDashboardStats: async (dateRange) => {
    console.log('API: Sending dashboard stats request with dateRange:', dateRange);
    try {
      const res = await axiosInstance.get(`/billing/dashboard-stats`, { params: dateRange });
      console.log('API: Dashboard stats response:', res.data);
      console.log('API: Response status:', res.status);
      return res.data;
    } catch (error) {
      console.error('API: Dashboard stats error:', error);
      console.error('API: Error response:', error.response?.data);
      throw error;
    }
  },
  createInvoice: (invoiceData) => invoicesAPI.create(invoiceData),
  // Function to fetch all invoices, with an optional filter for billing type (B2B/B2C)
  getInvoices: (billingType) => invoicesAPI.list(billingType),
  // Get a single invoice by ID
  getInvoiceById: (id) => invoicesAPI.get(id),
  reprintInvoice: (id, format) => invoicesAPI.reprint(id, format),
  // Generate payment QR code
  // Payment QR remains on legacy endpoint for now (no v2 equivalent yet)
  generatePaymentQr: async (id) => {
  const res = await axiosInstance.get(`/invoices/${id}/payment-qr`);
    return res.data;
  },
  // Delete an invoice by ID
  deleteInvoice: (id) => invoicesAPI.remove(id),
  // Get GST report data for a date range
  getGSTReport: async (dateRange) => {
    console.log('API: Fetching GST report for date range:', dateRange);
    try {
      const res = await axiosInstance.get(`/billing/gst-report`, { params: dateRange });
      return res.data;
    } catch (error) {
      console.error('API: GST report error:', error);
      throw error;
    }
  },
  // --- Quote operations ---
  getAllQuotes: async () => {
    const res = await axiosInstance.get(`/quotes`);
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
  createQuote: async (payload) => {
    const res = await axiosInstance.post(`/quotes`, payload);
    return res.data;
  },
  updateQuote: async (id, payload) => {
    const res = await axiosInstance.put(`/quotes/${id}`, payload);
    return res.data;
  },
  deleteQuote: async (id) => {
    const res = await axiosInstance.delete(`/quotes/${id}`);
    return res.data;
  },
  convertQuoteToSalesOrder: async (id) => {
    const res = await axiosInstance.post(`/quotes/${id}/convert-to-sales-order`);
    return res.data;
  },
  // --- Payments & Statements ---
  recordCustomerPayment: async (customerId, payload) => {
  // routed to v2 invoices service
  const res = await axiosInstance.post(`/invoices/customers/${customerId}/payments`, payload);
  return res.data;
  },
  emailCustomerStatement: async (customerId, payload) => {
    const res = await axiosInstance.post(`/billing/customers/${customerId}/email-statement`, payload);
    return res.data;
  },
};
