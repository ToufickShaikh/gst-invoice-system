import axiosInstance from './axiosInstance';

// itemsAPI provides both short and explicit method names because some
// UI modules call `itemsAPI.createItem` / `itemsAPI.deleteItem` while
// others use `itemsAPI.create` / `itemsAPI.delete` — keep both for
// backward compatibility.
export const itemsAPI = {
  getAll: async () => {
    const res = await axiosInstance.get(`/items`);
    return res.data;
  },

  // Primary create method
  create: async (item) => {
    const res = await axiosInstance.post(`/items`, item);
    return res.data;
  },

  // Backwards-compatible alias
  createItem: async (item) => {
    const res = await axiosInstance.post(`/items`, item);
    return res.data;
  },

  update: async (id, item) => {
    const res = await axiosInstance.put(`/items/${id}`, item);
    return res.data;
  },

  updateStock: async (id, quantityChange) => {
    const res = await axiosInstance.patch(`/items/${id}/stock`, { quantityChange });
    return res.data;
  },

  // Primary delete
  delete: async (id) => {
    const res = await axiosInstance.delete(`/items/${id}`);
    return res.data;
  },

  // Backwards-compatible alias (some code calls deleteItem)
  deleteItem: async (id) => {
    const res = await axiosInstance.delete(`/items/${id}`);
    return res.data;
  }
};
