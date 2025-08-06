import axiosInstance from './axiosInstance';

export const billingAPI = {
  updateInvoice: async (id, invoiceData) => {
    const res = await axiosInstance.put(`/billing/invoices/${id}`, invoiceData);
    return res.data;
  },
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
  createInvoice: async (invoiceData) => {
    const res = await axiosInstance.post(`/billing/invoices`, invoiceData);
    return res.data;
  },
  // Function to fetch all invoices, with an optional filter for billing type (B2B/B2C)
  getInvoices: async (billingType) => {
    console.log('Fetching invoices with type:', billingType);
    const response = await axiosInstance.get(`/billing/invoices`, {
      params: { billingType },
    });
    return response.data;
  },
  // Get a single invoice by ID
  getInvoiceById: async (id) => {
    const res = await axiosInstance.get(`/billing/invoices/${id}`);
    return res.data;
  },
  reprintInvoice: async (id) => {
    const res = await axiosInstance.post(`/billing/invoices/${id}/reprint`);
    return res.data;
  },
  // Generate payment QR code
  generatePaymentQr: async (id) => {
    const res = await axiosInstance.get(`/billing/invoices/${id}/payment-qr`);
    return res.data;
  },
  // Delete an invoice by ID
  deleteInvoice: async (id) => {
    const res = await axiosInstance.delete(`/billing/invoices/${id}`);
    return res.data;
  },
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
};
