// Layout component wraps all pages with header and navigation
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

// Layout provides navigation, header, and logout functionality
const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Handle user logout
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Navigation menu items
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/customers', label: 'Customers' },
    { path: '/items', label: 'Items' },
    { path: '/billing', label: 'Billing' },
    { path: '/invoices', label: 'Invoices' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with app title and user info */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">GST Billing System</h1>
            <div className="flex items-center space-x-4">
              {/* User info and logout button (hidden on small screens) */}
              <div className="hidden md:block">
                <span className="text-gray-600">Welcome, {user?.name}</span>
                <Button onClick={handleLogout} variant="secondary" size="sm" className="ml-4">
                  Logout
                </Button>
              </div>
              {/* Hamburger menu for mobile navigation */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-800 focus:outline-none"
                >
                  {isMenuOpen ? (
                    // "X" icon for when the menu is open
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    // "Hamburger" icon for when the menu is closed
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 text-white">
        <div className="container mx-auto px-4">
          {/* 4. Responsive Menu Container */}
          <div
            className={`md:flex md:space-x-8 ${isMenuOpen ? 'block' : 'hidden' // The menu is shown or hidden based on state
              }`}
          >
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)} // Close menu on link click
                className={`block py-3 md:py-4 px-3 text-center md:text-left border-b-2 transition-colors ${location.pathname === item.path
                  ? 'border-white bg-gray-700'
                  : 'border-transparent hover:border-gray-300 hover:bg-gray-700'
                  }`}
              >
                {item.label}
              </Link>
            ))}
            {/* Show Logout in mobile menu */}
            <div className="md:hidden text-center py-3">
              <span className="text-gray-400 block mb-3">Welcome, {user?.name}</span>
              <Button onClick={handleLogout} variant="secondary" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

export default Layout