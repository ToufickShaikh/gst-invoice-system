// Enhanced Layout component with modern responsive design
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

// Modern responsive layout with enhanced UX
const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Detect mobile device and screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.mobile-menu') && !event.target.closest('.menu-toggle')) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMenuOpen])

  // Handle user logout
  const handleLogout = () => {
    logout()
    navigate('/login')
    setIsMenuOpen(false)
  }

  // Navigation menu items with icons
  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      )
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
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
      path: '/billing',
      label: 'Billing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      path: '/invoices',
      label: 'Invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Enhanced Header with modern design */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-white shadow-md'
        }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3 fade-in">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-smooth">
                <span className="text-white font-bold text-lg lg:text-xl">S</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Shaikh Tools and Dies
                </h1>
                <p className="text-xs lg:text-sm text-gray-500 font-medium">
                  Professional GST Billing
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-smooth ${location.pathname === item.path
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* User Controls */}
            <div className="flex items-center space-x-4">
              {/* Desktop User Info */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">Welcome back!</p>
                  <p className="text-xs text-gray-500">{user?.name}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  size="sm"
                  className="btn-enhanced"
                >
                  Logout
                </Button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="menu-toggle lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-smooth touch-spacing"
                aria-label="Toggle menu"
              >
                <div className="relative w-6 h-6">
                  <span className={`absolute top-1 left-0 w-6 h-0.5 bg-current transform transition-smooth ${isMenuOpen ? 'rotate-45 translate-y-2' : ''
                    }`}></span>
                  <span className={`absolute top-3 left-0 w-6 h-0.5 bg-current transition-smooth ${isMenuOpen ? 'opacity-0' : ''
                    }`}></span>
                  <span className={`absolute top-5 left-0 w-6 h-0.5 bg-current transform transition-smooth ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''
                    }`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
        <nav className={`mobile-menu absolute top-16 right-0 w-80 max-w-full bg-white shadow-2xl transform transition-smooth ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-800">{user?.name}</p>
                <p className="text-sm text-gray-500">Administrator</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-6 py-4 transition-smooth ${location.pathname === item.path
                    ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-r-4 border-yellow-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="p-6 border-t border-gray-200">
            <Button
              onClick={handleLogout}
              variant="secondary"
              className="w-full btn-enhanced"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Button>
          </div>
        </nav>
      </div>

      {/* Main Content with enhanced spacing */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 safe-area">
        <div className="fade-in">
          {children}
        </div>
      </main>

      {/* Footer with branding */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="branding-section">
            <div className="relative z-10">
              <h3 className="text-lg lg:text-xl font-bold mb-2">
                Shaikh Tools and Dies - Professional Billing System
              </h3>
              <p className="text-sm opacity-90 mb-4">
                Streamlined GST invoicing with real-time verification
              </p>
              <div className="text-xs opacity-75">
                Crafted with ❤️ by{' '}
                <a
                  href="https://instagram.com/digital_hokage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-200 hover:text-white underline font-medium transition-smooth"
                >
                  @Digital_hokage
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout