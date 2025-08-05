// frontend/src/api/gst.js
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

export const gstAPI = {
    // Validate GSTIN format
    validateGSTIN: async (gstin) => {
        const res = await api.get(`/gst/validate/${gstin}`);
        return res.data;
    },

    // Verify GSTIN and get company details
    verifyGSTIN: async (gstin) => {
        const res = await api.get(`/gst/verify/${gstin}`);
        return res.data;
    },

    // Get tax type based on state codes
    getTaxType: async (companyStateCode, customerStateCode) => {
        const res = await api.get(`/gst/tax-type`, {
            params: { companyStateCode, customerStateCode }
        });
        return res.data;
    }
};
