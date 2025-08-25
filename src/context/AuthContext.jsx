import React, { createContext, useContext } from 'react'

// Minimal stub AuthContext after removing JWT auth.
// Provides same API shape but no-op implementations.
const AuthContext = createContext({
  user: null,
  userProfile: {},
  loading: false,
  login: async () => { throw new Error('Authentication removed') },
  register: async () => { throw new Error('Authentication removed') },
  logout: () => {},
  updateProfile: () => {},
  updatePreferences: () => {}
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const login = async () => { throw new Error('Authentication removed from this build') }
  const register = async () => { throw new Error('Authentication removed from this build') }
  return (
    <AuthContext.Provider value={{ user: null, userProfile: {}, loading: false, login, register, logout: () => {}, updateProfile: () => {}, updatePreferences: () => {} }}>
      {children}
    </AuthContext.Provider>
  )
}
