// frontend/src/api/customers.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

export const customersAPI = {
  getAll: async () => {
    return await axios.get(`${API_BASE_URL}/customers`);
  },

  create: async (customer) => {
    return await axios.post(`${API_BASE_URL}/customers`, customer);
  },

  update: async (id, customer) => {
    return await axios.put(`${API_BASE_URL}/customers/${id}`, customer);
  },

  delete: async (id) => {
    return await axios.delete(`${API_BASE_URL}/customers/${id}`);
  }
};