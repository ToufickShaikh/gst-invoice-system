import axiosInstance from './axiosInstance';

// New v2 Invoice API (mapped to /api/invoices backend)
export const invoicesAPI = {
  list: async (billingType) => {
    const res = await axiosInstance.get(`/invoices`, { params: { billingType } });
    return res.data;
  },
  get: async (id) => {
    const res = await axiosInstance.get(`/invoices/${id}`);
    return res.data;
  },
  create: async (payload) => {
    const res = await axiosInstance.post(`/invoices`, payload);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await axiosInstance.put(`/invoices/${id}`, payload);
    return res.data;
  },
  remove: async (id) => {
    const res = await axiosInstance.delete(`/invoices/${id}`);
    return res.data;
  },
  reprint: async (id, format='a4') => {
    const res = await axiosInstance.post(`/invoices/${id}/reprint`, null, { params: { format } });
    return res.data;
  },
  portalLink: async (id) => {
    const res = await axiosInstance.post(`/invoices/${id}/portal-link`);
    return res.data;
  },
  publicInvoice: async (id, token) => {
  const res = await axiosInstance.get(`/invoices/public/${id}`);
    return res.data;
  },
  publicPdfUrl: (id, token, format='a4') => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? (window.__apiBase || '') : '');
  if (apiBase) return `${apiBase.replace(/\/$/, '')}/invoices/public/${id}/pdf?format=${format}`;
  const appBase = (typeof window !== 'undefined') ? (window.__basename || import.meta.env.BASE_URL || '') : '';
  const prefix = appBase.replace(/\/$/, '');
  return `${prefix}/invoices/public/${id}/pdf?format=${format}`;
  }
};
