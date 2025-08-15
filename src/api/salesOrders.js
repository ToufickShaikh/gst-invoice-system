import axiosInstance from './axiosInstance';

export const salesOrdersAPI = {
  getAll: async () => {
    const res = await axiosInstance.get(`/sales-orders`);
    return res;
  },
  create: async (data) => {
    const res = await axiosInstance.post(`/sales-orders`, data);
    return res;
  },
  update: async (id, data) => {
    const res = await axiosInstance.put(`/sales-orders/${id}`, data);
    return res;
  },
  delete: async (id) => {
    const res = await axiosInstance.delete(`/sales-orders/${id}`);
    return res;
  },
  convertToInvoice: async (id) => {
    const res = await axiosInstance.post(`/sales-orders/${id}/convert-to-invoice`);
    return res;
  }
};