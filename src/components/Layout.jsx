import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

const Layout = ({ children }) => {
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false)
      }
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Close mobile menu when clicking outside or route changes
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.mobile-menu') && !event.target.closest('.menu-toggle')) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMenuOpen])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Navigation items
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
    }
  ]

  const isActiveRoute = (path) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    GST Invoice
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">Professional Billing</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item, idx) => (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm border border-transparent ${
                      isActiveRoute(item.path)
                        ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-300 scale-105'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:scale-105'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                  {/* Tooltip for guidance */}
                  <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 px-2 py-1 text-xs rounded bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Go to {item.label}
                  </span>
                  {/* Divider between sections for clarity */}
                  {idx === 2 || idx === 5 ? (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-px bg-gradient-to-b from-blue-200 to-purple-200 opacity-60"></div>
                  ) : null}
                </div>
              ))}
            </nav>

            {/* User Menu and Mobile Toggle */}
            <div className="flex items-center space-x-3">
              {/* User Info */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Welcome back!</p>
                  <p className="text-xs text-gray-500">{userProfile?.name || user?.email || 'User'}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {(userProfile?.name || user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="hidden sm:flex border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden menu-toggle p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`md:hidden mobile-menu transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden bg-white border-t border-gray-200`}>
          <div className="px-4 py-3 space-y-1">
            {/* User Info Mobile */}
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg mb-3 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {(userProfile?.name || user?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">{userProfile?.name || 'Welcome back!'}</p>
                <p className="text-xs text-gray-500">{userProfile?.email || user?.email || 'User'}</p>
              </div>
            </div>

            {/* Navigation Items */}
            {navItems.map((item, idx) => (
              <div key={item.path} className="relative group">
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm border border-transparent ${
                    isActiveRoute(item.path)
                      ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-300 scale-105'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:scale-105'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
                {/* Tooltip for guidance */}
                <span className="absolute left-1/2 -bottom-8 -translate-x-1/2 px-2 py-1 text-xs rounded bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Go to {item.label}
                </span>
                {/* Divider between sections for clarity */}
                {idx === 2 || idx === 5 ? (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-px bg-gradient-to-b from-blue-200 to-purple-200 opacity-60"></div>
                ) : null}
              </div>
            ))}

            {/* Logout Button Mobile */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors mt-3 border-t border-gray-200 pt-3 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {/* Page Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile App Feel */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="flex justify-around items-center py-2">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
                isActiveRoute('/dashboard')
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${
                isActiveRoute('/dashboard') ? 'bg-blue-100 scale-110' : ''
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xs font-medium">Home</span>
            </Link>

            {/* Billing */}
            <Link
              to="/billing"
              className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
                isActiveRoute('/billing')
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${
                isActiveRoute('/billing') ? 'bg-blue-100 scale-110' : ''
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xs font-medium">Invoice</span>
            </Link>

            {/* Invoices */}
            <Link
              to="/invoices"
              className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
                isActiveRoute('/invoices')
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${
                isActiveRoute('/invoices') ? 'bg-blue-100 scale-110' : ''
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium">Bills</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Bottom padding for mobile bottom nav */}
      {isMobile && <div className="h-16"></div>}
    </div>
  )
}

export default Layout
