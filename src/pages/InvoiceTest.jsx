// Simple test to debug the invoice creation flow
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { toast } from 'react-hot-toast'

const InvoiceTest = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const testInvoiceNavigation = () => {
        setLoading(true)

        // Simulate invoice creation response
        const mockResponse = {
            invoice: {
                _id: 'test-invoice-123',
                invoiceNumber: 'TEST-001'
            },
            pdfPath: '/invoices/test-invoice.pdf',
            upiQr: 'test-upi-qr-string'
        }

        const mockCustomerData = {
            _id: 'customer-123',
            name: 'Test Customer',
            firmName: 'Test Firm',
            contact: '1234567890',
            email: 'test@example.com'
        }

        const mockInvoiceData = {
            invoiceNumber: 'TEST-001',
            grandTotal: 1000,
            totalBeforeTax: 850,
            totalTax: 150,
            discount: 0,
            shippingCharges: 0,
            paidAmount: 500,
            balance: 500,
            paymentMethod: 'UPI',
            billingType: 'B2B',
            invoiceDate: new Date().toISOString()
        }

        const mockItems = [
            {
                name: 'Test Item',
                quantity: 1,
                rate: 850,
                itemTotal: 850,
                itemDiscount: 0,
                tax: { total: 150 }
            }
        ]

        // Create state object
        const successState = {
            invoiceId: mockResponse.invoice._id,
            invoiceNumber: mockResponse.invoice.invoiceNumber,
            pdfUrl: mockResponse.pdfPath,
            upiQr: mockResponse.upiQr,
            balance: mockInvoiceData.balance,
            customerData: mockCustomerData,
            invoiceData: mockInvoiceData,
            items: mockItems
        }

        console.log('Test: Navigating to invoice-success with state:', successState)

        setTimeout(() => {
            setLoading(false)
            navigate('/invoice-success', { state: successState })
        }, 1000)
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto px-3 sm:px-0">
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:p-8 text-center">
                    <h2 className="text-xl font-bold mb-4">Invoice Navigation Test</h2>
                    <p className="text-gray-600 mb-6">
                        This will test the navigation to the invoice success page with mock data.
                    </p>

                    <Button
                        onClick={testInvoiceNavigation}
                        disabled={loading}
                        variant="primary"
                        size="lg"
                    >
                        {loading ? 'Testing...' : 'Test Invoice Navigation'}
                    </Button>
                </div>
            </div>
        </Layout>
    )
}

export default InvoiceTest
