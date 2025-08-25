// Authentication has been removed in this build. Expose a client-side API
// that consistently rejects so callers don't perform network requests.
export const authAPI = {
  login: async (_credentials) => {
    return Promise.reject(new Error('Authentication removed from this build'));
  },
  register: async (_data) => {
    return Promise.reject(new Error('Authentication removed from this build'));
  },
  logout: async () => {
    return Promise.reject(new Error('Authentication removed from this build'));
  },
  getProfile: async () => {
    return Promise.reject(new Error('Authentication removed from this build'));
  }
};
