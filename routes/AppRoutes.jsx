import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from "../src/context/AuthContext";
import Dashboard from '../src/pages/Dashboard'
import Customers from '../src/pages/Customers'
import Items from '../src/pages/Items'
import Billing from '../src/pages/Billing'
import InvoiceSuccess from '../src/pages/InvoiceSuccess'
import Invoices from '../src/pages/Invoices'
import Login from '../src/pages/Login'
import EditInvoice from '../src/pages/EditInvoice' // Import the new page

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/items" element={<PrivateRoute><Items /></PrivateRoute>} />
      <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
      <Route path="/invoice-success" element={<PrivateRoute><InvoiceSuccess /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/edit-invoice/:id" element={<PrivateRoute><EditInvoice /></PrivateRoute>} /> {/* Add the new route */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default AppRoutes