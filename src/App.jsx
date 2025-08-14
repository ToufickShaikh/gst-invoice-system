// src/App.jsx

// Main React App component
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppRoutes from '../routes/AppRoutes.jsx' // App routes
import { AuthProvider } from './context/AuthContext' // Auth context provider
import { CompanyProvider } from './context/CompanyContext.jsx'
import ErrorBoundary from './components/ErrorBoundary' // Error boundary

// App is the root component that sets up routing and context
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/">
        <AuthProvider>
          <CompanyProvider>
            {/* Toast notifications */}
            <Toaster position="top-right" />
            {/* Main app routes */}
            <AppRoutes />
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App