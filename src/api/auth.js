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
  // Logout and getProfile might not need the token for their initial call,
  // but subsequent calls from the frontend will use the interceptor.
  logout: async () => {
    const res = await axiosInstance.post(`/auth/logout`); // Assuming a backend logout endpoint
    return res.data;
  },
  getProfile: async () => {
    const res = await axiosInstance.get(`/auth/profile`); // Assuming a backend profile endpoint
    return res.data;
  },
};
