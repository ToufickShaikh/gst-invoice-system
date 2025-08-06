import axiosInstance from './axiosInstance';

export const customersAPI = {
  getAll: async (customerType) => {
    const params = customerType ? { customerType } : {};
    const res = await axiosInstance.get(`/customers`, { params });
    return res.data;
  },
  create: async (customer) => {
    const res = await axiosInstance.post(`/customers`, customer);
    return res.data;
  },
  update: async (id, customer) => {
    const res = await axiosInstance.put(`/customers/${id}`, customer);
    return res.data;
  },
  delete: async (id) => {
    const res = await axiosInstance.delete(`/customers/${id}`);
    return res.data;
  },
};
