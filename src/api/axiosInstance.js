import axios from 'axios';

import { getApiBaseUrl } from '../utils/appBase';

const API_BASE_URL = getApiBaseUrl() || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    // ignore
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default axiosInstance;
