import axiosInstance from './axiosInstance';

export const portalAPI = {
  // Protected: create links
  createInvoicePortalLink: async (id) => {
    const res = await axiosInstance.post(`/billing/invoices/${id}/portal-link`);
    return res.data;
  },
  createCustomerPortalLink: async (customerId) => {
    const res = await axiosInstance.post(`/billing/customers/${customerId}/portal-link`);
    return res.data;
  },
  // Public fetchers (no auth headers needed, but axiosInstance will include)
  getPublicInvoice: async (id, token) => {
    const res = await axiosInstance.get(`/billing/public/invoices/${id}`, { params: { token } });
    return res.data;
  },
  getPublicStatement: async (customerId, token, params = {}) => {
    const res = await axiosInstance.get(`/billing/public/customers/${customerId}/statement`, { params: { token, ...params } });
    return res.data;
  }
};
