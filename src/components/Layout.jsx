import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

const Layout = ({ children }) => {
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/billing',
      label: 'Create Invoice',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      path: '/invoices',
      label: 'All Invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      path: '/items',
      label: 'Items',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      path: '/purchases',
      label: 'Purchases',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      path: '/sales-orders',
      label: 'Sales Orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      path: '/quotes',
      label: 'Quotes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    },
    {
      path: '/suppliers',
      label: 'Suppliers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h2a2 2 0 002-2V8a2 2 0 00-2-2h-2M17 20V6M17 20H7m10 0v-2a2 2 0 00-2-2H9a2 2 0 00-2 2v2M7 20H5a2 2 0 01-2-2V8a2 2 0 012-2h2m0 0V4a2 2 0 012-2h4a2 2 0 012 2v2M7 6h10" />
        </svg>
      )
    },
    {
      path: '/cash-drawer',
      label: 'Cash Drawer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm4 10h6" />
        </svg>
      )
    }
  ]

  const isActiveRoute = (path) => location.pathname === path

  const bottomNavPaths = new Set(['/dashboard', '/billing', '/invoices', '/customers', '/cash-drawer'])
  const mobileNavItems = navItems.filter(n => bottomNavPaths.has(n.path))

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Modern Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-xl transition-all duration-300 ease-in-out lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-0'
      } ${isMobile ? 'w-72' : ''}`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-white">
                InvoicePro
              </span>
              <div className="text-xs text-blue-100">Business Suite</div>
            </div>
          </Link>
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">
                {(userProfile?.name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{userProfile?.name || 'Welcome!'}</p>
              <p className="text-xs text-gray-500 truncate">{userProfile?.email || user?.email || 'User'}</p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-xs text-green-600">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActiveRoute(item.path)
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className={`${isActiveRoute(item.path) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                {item.icon}
              </div>
              <span>{item.label}</span>
              {isActiveRoute(item.path) && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            variant="outline"
            fullWidth
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
      }`}>
        
        {/* Modern Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-20 px-6 bg-white border-b border-gray-200 shadow-sm lg:hidden">
          <div className="flex items-center space-x-4">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">
                InvoicePro
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{userProfile?.name || 'Welcome!'}</p>
              <p className="text-xs text-gray-500">{userProfile?.email || user?.email || 'User'}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {(userProfile?.name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hidden sm:flex"
            >
              Logout
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Modern Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area">
          <div className="flex">
            {mobileNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                  isActiveRoute(item.path) 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className={`mb-1 ${isActiveRoute(item.path) ? 'text-blue-600' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium">
                  {item.label.replace('Create Invoice','Billing').replace('All Invoices','Invoices')}
                </span>
                {isActiveRoute(item.path) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default Layout