import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export const customersAPI = {
  getAll: async () => {
    // Dummy data
    return {
      data: [
        {
          id: 1,
          type: 'B2B',
          firmName: 'ABC Corp',
          gstNo: '27AABCU9603R1ZM',
          address: 'Mumbai, Maharashtra',
          contact: '9876543210'
        },
        {
          id: 2,
          type: 'B2C',
          name: 'John Doe',
          contact: '9876543211'
        }
      ]
    }
  },

  create: async (customer) => {
    return { data: { ...customer, id: Date.now() } }
  },

  update: async (id, customer) => {
    return { data: { ...customer, id } }
  },

  delete: async (id) => {
    return { data: { success: true } }
  }
}
