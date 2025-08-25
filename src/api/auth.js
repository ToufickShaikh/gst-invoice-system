// Authentication has been removed in this build. Expose a client-side API
// that consistently rejects so callers don't perform network requests.
import axiosInstance from './axiosInstance';

export const authAPI = {
  login: async (credentials) => {
    const payload = credentials.username ? { username: credentials.username, password: credentials.password } : credentials;
    const res = await axiosInstance.post(`/auth/login`, payload);
    return res.data;
  },
  register: async (data) => {
    const res = await axiosInstance.post(`/auth/register`, data);
    return res.data;
  },
  logout: async () => {
    // Optionally call backend logout if implemented
    return { success: true };
  },
  getProfile: async () => {
    const res = await axiosInstance.get(`/auth/profile`);
    return res.data;
  }
};
