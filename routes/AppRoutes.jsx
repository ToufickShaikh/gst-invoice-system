import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from "../src/context/AuthContext";
import Dashboard from '../src/pages/Dashboard'
import AdvancedDashboard from '../src/pages/AdvancedDashboard'
import Customers from '../src/pages/Customers'
import Items from '../src/pages/Items'
import Billing from '../src/pages/Billing'
import InvoiceSuccess from '../src/pages/InvoiceSuccess'
import Invoices from '../src/pages/Invoices'
import Login from '../src/pages/Login'
import EditInvoice from '../src/pages/EditInvoice'
import Purchases from '../src/pages/Purchases'
import EnhancedQuoteManagement from '../src/components/EnhancedQuoteManagement'
import NewQuote from '../src/pages/NewQuote'
import Suppliers from '../src/pages/Suppliers'
import CashDrawer from '../src/pages/CashDrawer'
import EnhancedSalesOrderManagement from '../src/components/EnhancedSalesOrderManagement'
import PortalInvoice from '../src/pages/PortalInvoice'
import PortalStatement from '../src/pages/PortalStatement'
import GstFilings from '../src/pages/GstFilings'
import PosQuickBilling from '../src/pages/PosQuickBilling'

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
      {/* Public portal routes */}
      <Route path="/portal/invoice/:id/:token" element={<PortalInvoice />} />
      <Route path="/portal/customer/:customerId/:token/statement" element={<PortalStatement />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<PrivateRoute><AdvancedDashboard /></PrivateRoute>} />
      <Route path="/dashboard-simple" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/items" element={<PrivateRoute><Items /></PrivateRoute>} />
      <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
      <Route path="/invoice-success" element={<PrivateRoute><InvoiceSuccess /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/edit-invoice/:id" element={<PrivateRoute><EditInvoice /></PrivateRoute>} />
      <Route path="/purchases" element={<PrivateRoute><Purchases /></PrivateRoute>} />
      <Route path="/sales-orders" element={<PrivateRoute><EnhancedSalesOrderManagement /></PrivateRoute>} />
      <Route path="/quotes" element={<PrivateRoute><EnhancedQuoteManagement /></PrivateRoute>} />
      <Route path="/quotes/new" element={<PrivateRoute><NewQuote /></PrivateRoute>} />
      <Route path="/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
      <Route path="/cash-drawer" element={<PrivateRoute><CashDrawer /></PrivateRoute>} />
  <Route path="/pos" element={<PrivateRoute><PosQuickBilling /></PrivateRoute>} />
      <Route path="/gst-filings" element={<PrivateRoute><GstFilings /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default AppRoutes