import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://gst-invoice-system-back.onrender.com/api';

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

// Example auth API functions
export const authAPI = {
  login: async (credentials) => {
    // Map username to email for backend compatibility if needed
    const payload = credentials.username ? { username: credentials.username, password: credentials.password } : credentials;
    const res = await api.post(`/auth/login`, payload);
    return res.data;
  },
  register: async (data) => {
    const res = await api.post(`/auth/register`, data);
    return res.data;
  },
  logout: async () => {
    const res = await api.post(`/auth/logout`);
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get(`/auth/profile`);
    return res.data;
  },
};