import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { toast } from 'react-hot-toast'

const InvoiceSuccessTest = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('InvoiceSuccessTest: location.state:', location.state);
    setLoading(false);
  }, [location.state]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-3 sm:px-0">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  const { invoiceId, pdfUrl, upiQr, balance, invoiceNumber, customerData, invoiceData, items } = location.state || {}

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 sm:px-0">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-green-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">Invoice Test Page</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Invoice ID:</strong> {invoiceId || 'Missing'}</p>
              <p><strong>Invoice Number:</strong> {invoiceNumber || 'Missing'}</p>
              <p><strong>PDF URL:</strong> {pdfUrl || 'Missing'}</p>
              <p><strong>Balance:</strong> {balance || 'Missing'}</p>
              <p><strong>Customer Data:</strong> {customerData ? 'Present' : 'Missing'}</p>
              <p><strong>Invoice Data:</strong> {invoiceData ? 'Present' : 'Missing'}</p>
              <p><strong>Items:</strong> {items ? items.length + ' items' : 'Missing'}</p>
              <p><strong>Location State:</strong> {location.state ? 'Present' : 'Missing'}</p>
            </div>
          </div>

          {customerData && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-semibold mb-2">Customer Information:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {customerData.name || 'N/A'}</p>
                <p><strong>Firm:</strong> {customerData.firmName || 'N/A'}</p>
                <p><strong>Contact:</strong> {customerData.contact || 'N/A'}</p>
                <p><strong>Email:</strong> {customerData.email || 'N/A'}</p>
              </div>
            </div>
          )}

          {invoiceData && (
            <div className="bg-green-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-semibold mb-2">Invoice Summary:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Grand Total:</strong> ₹{invoiceData.grandTotal || 'N/A'}</p>
                <p><strong>Paid Amount:</strong> ₹{invoiceData.paidAmount || 'N/A'}</p>
                <p><strong>Balance:</strong> ₹{invoiceData.balance || 'N/A'}</p>
                <p><strong>Payment Method:</strong> {invoiceData.paymentMethod || 'N/A'}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/billing')}
              variant="primary"
              size="lg"
            >
              Create New Invoice
            </Button>
            <Button
              onClick={() => navigate('/invoices')}
              variant="secondary"
              size="lg"
            >
              View All Invoices
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InvoiceSuccessTest
