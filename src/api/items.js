// frontend/src/api/items.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://gst-invoice-system-back.onrender.com/api';

export const itemsAPI = {
  getAll: async () => {
    const res = await axios.get(`${API_BASE_URL}/items`);
    return res.data;
  },
  create: async (item) => {
    const res = await axios.post(`${API_BASE_URL}/items`, item);
    return res.data;
  },
  update: async (id, item) => {
    const res = await axios.put(`${API_BASE_URL}/items/${id}`, item);
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_BASE_URL}/items/${id}`);
    return res.data;
  }
};