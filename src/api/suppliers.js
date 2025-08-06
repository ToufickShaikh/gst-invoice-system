import axiosInstance from './axiosInstance';

export const suppliersAPI = {
  getAll: async () => {
    const res = await axiosInstance.get(`/suppliers`);
    return res.data;
  },
  getById: async (id) => {
    const res = await axiosInstance.get(`/suppliers/${id}`);
    return res.data;
  },
  create: async (supplier) => {
    const res = await axiosInstance.post(`/suppliers`, supplier);
    return res.data;
  },
  update: async (id, supplier) => {
    const res = await axiosInstance.put(`/suppliers/${id}`, supplier);
    return res.data;
  },
  delete: async (id) => {
    const res = await axiosInstance.delete(`/suppliers/${id}`);
    return res.data;
  },
};
