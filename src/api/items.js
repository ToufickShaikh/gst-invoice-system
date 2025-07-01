// frontend/src/api/items.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // The base URL for your backend

export const itemsAPI = {
  getAll: async () => {
    return await axios.get(`${API_BASE_URL}/items`);
  },

  create: async (item) => {
    return await axios.post(`${API_BASE_URL}/items`, item);
  },

  update: async (id, item) => {
    return await axios.put(`${API_BASE_URL}/items/${id}`, item);
  },

  delete: async (id) => {
    return await axios.delete(`${API_BASE_URL}/items/${id}`);
  }
};