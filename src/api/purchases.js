import axiosInstance from './axiosInstance';

export const purchasesAPI = {
  getAllPurchases: async () => {
    const res = await axiosInstance.get('/purchases');
    return res.data;
  },
  createPurchase: async (purchaseData) => {
    const res = await axiosInstance.post('/purchases', purchaseData);
    return res.data;
  },
  updatePurchase: async (id, purchaseData) => {
    const res = await axiosInstance.put(`/purchases/${id}`, purchaseData);
    return res.data;
  },
  deletePurchase: async (id) => {
    const res = await axiosInstance.delete(`/purchases/${id}`);
    return res.data;
  },
};
