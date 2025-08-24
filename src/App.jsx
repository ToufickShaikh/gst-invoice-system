// src/App.jsx - Enhanced with advanced optimization features

import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

// Enhanced components
import AppRoutes from '../routes/AppRoutes.jsx'
import { AuthProvider } from './context/AuthContext'
import { CompanyProvider } from './context/CompanyContext.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// Optimizations
import { queryClient } from './lib/reactQuery'
import { useAppStore } from './store'

// Performance monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}

// Enhanced loading component with better UX
const AppLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-indigo-300 opacity-25"></div>
      </div>
      <p className="text-gray-600 font-medium text-lg">Loading GST Invoice System...</p>
      <p className="text-gray-400 text-sm mt-2">Please wait while we prepare everything</p>
    </div>
  </div>
);

// Enhanced App component with advanced features
function App() {
  const { theme, animations } = useAppStore((state) => ({
    theme: state.theme,
    animations: state.animations
  }));

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename="/shaikhcarpets">
          <div className={`app ${theme} ${animations ? 'animations-enabled' : 'animations-disabled'}`}>
            <AuthProvider>
              <CompanyProvider>
                <Suspense fallback={<AppLoader />}>
                  {/* Enhanced toast with better styling */}
                  <Toaster 
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                        fontSize: '14px',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      },
                      success: {
                        style: {
                          background: '#059669',
                        }
                      },
                      error: {
                        style: {
                          background: '#DC2626',
                        }
                      }
                    }}
                  />
                  
                  {/* Main app routes */}
                  <AppRoutes />
                </Suspense>
              </CompanyProvider>
            </AuthProvider>
          </div>
        </BrowserRouter>
        
        {/* React Query DevTools (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App