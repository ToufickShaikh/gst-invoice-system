import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const suppliersAPI = {
  getAll: async () => {
    const res = await api.get(`/suppliers`);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
  },
  create: async (supplier) => {
    const res = await api.post(`/suppliers`, supplier);
    return res.data;
  },
  update: async (id, supplier) => {
    const res = await api.put(`/suppliers/${id}`, supplier);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/suppliers/${id}`);
    return res.data;
  },
};
