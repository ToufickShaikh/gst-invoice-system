import React, { createContext, useState, useContext, useEffect } from 'react'

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
    // Check for stored user and profile
    const storedUser = localStorage.getItem('user')
    const storedProfile = localStorage.getItem('userProfile')
    
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      
      // Set default profile or load stored profile
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile))
      } else {
        // Create default profile
        const defaultProfile = {
          name: userData.name || userData.username || 'Admin User',
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
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Update last login time
    const updatedProfile = {
      ...userProfile,
      lastLogin: new Date().toISOString(),
      name: userData.name || userData.username || 'Admin User',
      email: userData.email || 'admin@gstinvoice.com'
    }
    setUserProfile(updatedProfile)
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    // Keep user profile for next login
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      login, 
      logout, 
      loading, 
      updateProfile, 
      updatePreferences 
    }}>
      {children}
    </AuthContext.Provider>
  )
}