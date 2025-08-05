import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export const purchasesAPI = {
  getAllPurchases: async () => {
    const res = await api.get('/purchases');
    return res.data;
  },
  createPurchase: async (purchaseData) => {
    const res = await api.post('/purchases', purchaseData);
    return res.data;
  },
  updatePurchase: async (id, purchaseData) => {
    const res = await api.put(`/purchases/${id}`, purchaseData);
    return res.data;
  },
  deletePurchase: async (id) => {
    const res = await api.delete(`/purchases/${id}`);
    return res.data;
  },
};