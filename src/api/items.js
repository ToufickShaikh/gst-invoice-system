import axiosInstance from './axiosInstance';

export const itemsAPI = {
  getAll: async () => {
    const res = await axiosInstance.get(`/items`);
    return res.data;
  },
  create: async (item) => {
    const res = await axiosInstance.post(`/items`, item);
    return res.data;
  },
  update: async (id, item) => {
    const res = await axiosInstance.put(`/items/${id}`, item);
    return res.data;
  },
  delete: async (id) => {
    const res = await axiosInstance.delete(`/items/${id}`);
    return res.data;
  }
};
