// src/App.jsx

// Main React App component
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppRoutes from '../routes/AppRoutes.jsx' // App routes
import { AuthProvider } from './context/AuthContext' // Auth context provider

// App is the root component that sets up routing and context
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Toast notifications */}
        <Toaster position="top-right" />
        {/* Main app routes */}
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App