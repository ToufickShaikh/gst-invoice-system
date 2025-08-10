import axios from 'axios';

// Force localhost for development
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3000/api' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://185.52.53.253/shaikh_carpets/api');

console.log('[API] Using API Base URL:', API_BASE_URL);
console.log('[API] Development mode:', isDevelopment);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default axiosInstance;
