import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { customersAPI } from '../api/customers'
import { itemsAPI } from '../api/items'
import { billingAPI } from '../api/billing'
import { calculateTax, calculateTotal } from '../utils/taxCalculations'
import { formatCurrency } from '../utils/dateHelpers'

const Billing = () => {
  const navigate = useNavigate()
  const [billingType, setBillingType] = useState('B2B')
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [billItems, setBillItems] = useState([])
  const [discount, setDiscount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [billingType])

  const fetchData = async () => {
    try {
      const [customersRes, itemsRes] = await Promise.all([
        customersAPI.getAll(),
        itemsAPI.getAll()
      ])
      setCustomers(customersRes.data.filter(c => c.type === billingType))
      setItems(itemsRes.data)
    } catch (error) {
      toast.error('Failed to fetch data')
    }
  }

  const handleAddItem = () => {
    setBillItems([...billItems, { itemId: '', quantity: 1, item: null }])
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...billItems]
    if (field === 'itemId') {
      const selectedItem = items.find(i => i.id === parseInt(value))
      updatedItems[index] = { ...updatedItems[index], itemId: value, item: selectedItem }
    } else {
      updatedItems[index][field] = value
    }
    setBillItems(updatedItems)
  }

  const handleRemoveItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index))
  }

  const getCustomerDetails = () => {
    const customer = customers.find(c => c.id === parseInt(selectedCustomer))
    return customer
  }

  const getBillItemsWithTax = () => {
    const customer = getCustomerDetails()
    const isInterState = billingType === 'B2B' && customer?.address && 
                        !customer.address.toLowerCase().includes('maharashtra')

    return billItems.map(billItem => {
      if (!billItem.item) return null
      const itemTotal = billItem.item.price * billItem.quantity
      const discountAmount = (itemTotal * discount) / 100
      const taxableAmount = itemTotal - discountAmount
      const tax = calculateTax(taxableAmount, billItem.item.taxSlab, isInterState)
      
      return {
        ...billItem,
        itemTotal,
        discountAmount,
        taxableAmount,
        tax,
        totalWithTax: taxableAmount + tax.total
      }
    }).filter(Boolean)
  }

  const totals = calculateTotal(
    billItems.filter(item => item.item).map(item => ({
      ...item.item,
      quantity: item.quantity
    })),
    discount
  )

  const handleGenerateInvoice = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }
    if (billItems.length === 0 || !billItems.some(item => item.item)) {
      toast.error('Please add at least one item')
      return
    }

    setLoading(true)
    try {
      const invoiceData = {
        customerId: selectedCustomer,
        customer: getCustomerDetails(),
        items: getBillItemsWithTax(),
        discount,
        totals,
        paidAmount,
        balance: totals.grandTotal - paidAmount,
        billingType
      }

      const response = await billingAPI.createInvoice(invoiceData)
      toast.success('Invoice generated successfully!')
      navigate('/invoice-success', { 
        state: { 
          invoiceId: response.data.invoiceId,
          pdfUrl: response.data.pdfUrl,
          upiQr: response.data.upiQr,
          balance: invoiceData.balance
        }
      })
    } catch (error) {
      toast.error('Failed to generate invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Generate Invoice</h1>

        {/* Billing Type Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setBillingType('B2B')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                billingType === 'B2B'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              B2B Invoice
            </button>
            <button
              onClick={() => setBillingType('B2C')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                billingType === 'B2C'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              B2C Invoice
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Customer Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {billingType === 'B2B' ? customer.firmName : customer.name} - {customer.contact}
                </option>
              ))}
            </select>
          </div>

          {/* Items Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <Button onClick={handleAddItem} size="sm">
                Add Item
              </Button>
            </div>

            {billItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added</p>
            ) : (
              <div className="space-y-4">
                {billItems.map((billItem, index) => (
                  <div key={index} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item
                      </label>
                      <select
                        value={billItem.itemId}
                        onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an item</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} - {formatCurrency(item.price)} - {item.taxSlab}% GST
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <InputField
                        label="Quantity"
                        type="number"
                        value={billItem.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>
                    <Button
                      onClick={() => handleRemoveItem(index)}
                      variant="danger"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <InputField
              label="Discount (%)"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
            />
            <InputField
              label="Paid Amount"
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>

          {/* Summary */}
          {billItems.some(item => item.item) && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>- {formatCurrency(totals.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxable Amount:</span>
                  <span>{formatCurrency(totals.taxableAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span>{formatCurrency(totals.totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Balance:</span>
                  <span>{formatCurrency(totals.grandTotal - paidAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Generate Invoice Button */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleGenerateInvoice}
              variant="primary"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Billing