import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { formatCurrency } from '../utils/dateHelpers'

const InvoiceSuccess = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { invoiceId, pdfUrl, upiQr, balance } = location.state || {}

  if (!invoiceId) {
    navigate('/billing')
    return null
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <svg
              className="w-20 h-20 text-green-500 mx-auto"
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

          <h2 className="text-2xl font-bold mb-4">Invoice Generated Successfully!</h2>
          <p className="text-gray-600 mb-6">Invoice ID: {invoiceId}</p>

          {/* PDF Download */}
          <div className="mb-8">
            <Button
              onClick={() => window.open(pdfUrl, '_blank')}
              variant="primary"
              size="lg"
            >
              Download Invoice PDF
            </Button>
          </div>

          {/* UPI QR Code */}
          {balance > 0 && upiQr && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">
                Balance Amount: {formatCurrency(balance)}
              </h3>
              <p className="text-gray-600 mb-4">Scan the QR code to pay via UPI</p>
              <div className="bg-gray-100 p-4 rounded-lg inline-block">
                <div className="w-48 h-48 bg-white border-2 border-gray-300 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">QR Code Placeholder</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">UPI: {upiQr}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center space-x-4 mt-8">
            <Button
              onClick={() => navigate('/billing')}
              variant="secondary"
            >
              Create New Invoice
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="secondary"
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Success Page Branding */}
          <div className="mt-8 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-sm font-medium">
              Professional Invoicing by <strong>Shaikh Tools and Dies</strong>
            </p>
            <div className="mt-2 text-xs opacity-75">
              Powered by{' '}
              <a
                href="https://instagram.com/digital_hokage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-200 hover:text-white underline font-medium"
              >
                @Digital_hokage
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InvoiceSuccess