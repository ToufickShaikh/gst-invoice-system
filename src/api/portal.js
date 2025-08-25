import axiosInstance from './axiosInstance';
import { invoicesAPI } from './invoices';

export const portalAPI = {
  // Protected: create links
  createInvoicePortalLink: (id) => invoicesAPI.portalLink(id),
  createCustomerPortalLink: async (customerId) => {
    const res = await axiosInstance.post(`/billing/customers/${customerId}/portal-link`);
    return res.data;
  },
  // Public fetchers (token optional on server)
  getPublicInvoice: (id) => invoicesAPI.publicInvoice(id),
  getPublicStatement: async (customerId, params = {}) => {
    const res = await axiosInstance.get(`/billing/public/customers/${customerId}/statement`, { params });
    return res.data;
  }
};
