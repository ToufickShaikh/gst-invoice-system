import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export const authAPI = {
  login: async (credentials) => {
    // Dummy login for now
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      return { data: { user: { id: 1, name: 'Admin User', username: 'admin' } } }
    }
    throw new Error('Invalid credentials')
  }
}