import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API_URL = `${API_BASE_URL}/sales-orders`;

export const salesOrdersAPI = {
  getAll: async () => {
    const res = await axios.get(`${API_URL}`);
    return res;
  },
  create: async (data) => {
    const res = await axios.post(`${API_URL}`, data);
    return res;
  },
  update: async (id, data) => {
    const res = await axios.put(`${API_URL}/${id}`, data);
    return res;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_URL}/${id}`);
    return res;
  }
};
