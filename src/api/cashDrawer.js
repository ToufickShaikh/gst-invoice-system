import axiosInstance from './axiosInstance';

export const cashDrawerAPI = {
  getStatus: async () => {
    const res = await axiosInstance.get('/cash-drawer');
    return res.data;
  },
  adjust: async (payload) => {
    const res = await axiosInstance.post('/cash-drawer/adjust', payload);
    return res.data;
  },
  recordSale: async ({ invoiceId, amount, denominations }) => {
    const res = await axiosInstance.post('/cash-drawer/record-sale', { invoiceId, amount, denominations });
    return res.data;
  },
};
