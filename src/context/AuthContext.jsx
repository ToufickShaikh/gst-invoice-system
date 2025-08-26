import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext({
  user: null,
  userProfile: {},
  loading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateProfile: () => {},
  updatePreferences: () => {}
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
  const userJson = localStorage.getItem('auth_user')
  // allow token-less flows: if a stored user exists, restore it
  if (userJson) setUser(JSON.parse(userJson))
    } catch (e) { /* ignore */ }
  }, [])

  const login = async (username, password) => {
    setLoading(true)
    try {
      const res = await authAPI.login({ username, password })
      // Support token-less backend: persist and set user when available
      if (res && (res.token || res.user)) {
        if (res.token) localStorage.setItem('auth_token', res.token)
        localStorage.setItem('auth_user', JSON.stringify(res.user || { username }))
        setUser(res.user || { username })
      }
      return res
    } finally {
      setLoading(false)
    }
  }

  const register = async (username, email, password) => {
    setLoading(true)
    try {
      const res = await authAPI.register({ username, email, password })
      if (res && (res.token || res.user)) {
        if (res.token) localStorage.setItem('auth_token', res.token)
        localStorage.setItem('auth_user', JSON.stringify(res.user || { username }))
        setUser(res.user || { username })
      }
      return res
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, userProfile: user || {}, loading, login, register, logout, updateProfile: () => {}, updatePreferences: () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}
