import axiosInstance from './axiosInstance';
import { invoicesAPI } from './invoices';

export const portalAPI = {
  // Protected: create links
  createInvoicePortalLink: (id) => invoicesAPI.portalLink(id),
  createCustomerPortalLink: async (customerId) => {
    const res = await axiosInstance.post(`/billing/customers/${customerId}/portal-link`);
    return res.data;
  },
  // Public fetchers (no auth headers needed, but axiosInstance will include)
  getPublicInvoice: (id, token) => invoicesAPI.publicInvoice(id, token),
  getPublicStatement: async (customerId, token, params = {}) => {
    const res = await axiosInstance.get(`/billing/public/customers/${customerId}/statement`, { params: { token, ...params } });
    return res.data;
  }
};
