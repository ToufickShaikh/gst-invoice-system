import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export const itemsAPI = {
  getAll: async () => {
    // Dummy data
    return {
      data: [
        {
          id: 1,
          name: 'Product A',
          hsnCode: '1234',
          price: 1000,
          taxSlab: 18
        },
        {
          id: 2,
          name: 'Product B',
          hsnCode: '5678',
          price: 500,
          taxSlab: 12
        }
      ]
    }
  },
  
  create: async (item) => {
    return { data: { ...item, id: Date.now() } }
  },
  
  update: async (id, item) => {
    return { data: { ...item, id } }
  },
  
  delete: async (id) => {
    return { data: { success: true } }
  }
}