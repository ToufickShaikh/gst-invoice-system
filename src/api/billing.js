import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export const billingAPI = {
  createInvoice: async (invoiceData) => {
    // Simulate API call
    return {
      data: {
        invoiceId: `INV-${Date.now()}`,
        pdfUrl: '/invoice.pdf',
        upiQr: invoiceData.balance > 0 ? 'upi://pay?pa=merchant@upi&am=' + invoiceData.balance : null
      }
    }
  },
  
  getDashboardStats: async (dateRange) => {
    // Dummy stats
    return {
      data: {
        totalSales: 125000,
        totalPayable: 15000,
        totalReceivable: 35000
      }
    }
  }
}