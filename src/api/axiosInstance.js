import axios from 'axios';

import { getApiBaseUrl, getAppBasePath } from '../utils/appBase';

// Runtime-aware API base: prefer explicit Vite config, then runtime app base + '/api',
// otherwise fallback to relative '/api' so calls work under subpath deployments.
let API_BASE_URL = getApiBaseUrl() || import.meta.env.VITE_API_BASE_URL || '';
if (!API_BASE_URL) {
  try {
    const base = (typeof window !== 'undefined' ? getAppBasePath() : '') || '';
    API_BASE_URL = `${base}/api`.replace(/\/\//g, '/');
  } catch (e) {
    API_BASE_URL = '/api';
  }
}

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
