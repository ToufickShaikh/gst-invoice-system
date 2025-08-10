import React, { createContext, useState, useContext, useEffect } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    role: 'Admin',
    joinDate: '',
    lastLogin: '',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: true
    }
  })

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          // In a real app, you'd verify the token with the backend
          // For now, we'll just assume it's valid if it exists
          // and try to fetch user profile if available
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            setUser(JSON.parse(storedUser))
          }
          const storedProfile = localStorage.getItem('userProfile')
          if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile))
          } else if (storedUser) {
            // If user data exists but profile doesn't, create a default one
            const userData = JSON.parse(storedUser)
            const defaultProfile = {
              name: userData.username || 'Admin User',
              email: userData.email || 'admin@gstinvoice.com',
              role: 'Administrator',
              joinDate: new Date().toISOString().split('T')[0],
              lastLogin: new Date().toISOString(),
              preferences: {
                theme: 'light',
                language: 'en',
                notifications: true
              }
            }
            setUserProfile(defaultProfile)
            localStorage.setItem('userProfile', JSON.stringify(defaultProfile))
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('userProfile')
          setUser(null)
          setUserProfile({
            name: '',
            email: '',
            role: 'Admin',
            joinDate: '',
            lastLogin: '',
            preferences: {
              theme: 'light',
              language: 'en',
              notifications: true
            }
          })
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (username, password) => {
    try {
      const data = await authAPI.login({ username, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ _id: data._id, username: data.username, email: data.email }))
      setUser({ _id: data._id, username: data.username, email: data.email })

      // Update user profile on login
      const updatedProfile = {
        ...userProfile,
        name: data.username,
        email: data.email,
        lastLogin: new Date().toISOString(),
      }
      setUserProfile(updatedProfile)
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile))

      return data
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const register = async (username, email, password) => {
    try {
      const data = await authAPI.register({ username, email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ _id: data._id, username: data.username, email: data.email }))
      setUser({ _id: data._id, username: data.username, email: data.email })

      // Create initial user profile on registration
      const newProfile = {
        name: data.username,
        email: data.email,
        role: 'Administrator',
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString(),
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true
        }
      }
      setUserProfile(newProfile)
      localStorage.setItem('userProfile', JSON.stringify(newProfile))

      return data
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userProfile') // Clear profile on logout
    setUser(null)
    setUserProfile({
      name: '',
      email: '',
      role: 'Admin',
      joinDate: '',
      lastLogin: '',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: true
      }
    })
  }

  const updateProfile = (updates) => {
    const updatedProfile = { ...userProfile, ...updates }
    setUserProfile(updatedProfile)
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile))
  }

  const updatePreferences = (preferences) => {
    const updatedProfile = {
      ...userProfile,
      preferences: { ...userProfile.preferences, ...preferences }
    }
    setUserProfile(updatedProfile)
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile))
  }

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updatePreferences,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
