import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

console.log('[API] Using API Base URL:', API_BASE_URL);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(config => {
  // Authentication disabled — do not attach Authorization header
  // If you later enable auth, re-enable token injection here
  return config;
}, error => {
  return Promise.reject(error);
});

export default axiosInstance;
