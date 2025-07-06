import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { customersAPI } from '../api/customers'
import { itemsAPI } from '../api/items'
import { billingAPI } from '../api/billing'
import { gstAPI } from '../api/gst'
import { calculateTax, calculateTotal } from '../utils/taxCalculations'
import { formatCurrency } from '../utils/dateHelpers'

const Billing = () => {
  const navigate = useNavigate()
  const [billingType, setBillingType] = useState('B2B')
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [billItems, setBillItems] = useState([])
  const [discountAmt, setDiscountAmt] = useState(0)
  const [shippingCharges, setShippingCharges] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [loading, setLoading] = useState(false)
  const [taxType, setTaxType] = useState('CGST_SGST') // 'IGST' or 'CGST_SGST'
  const [companyStateCode, setCompanyStateCode] = useState('27') // Default Maharashtra

  useEffect(() => {
    fetchData()
  }, [billingType])

  const fetchData = async () => {
    try {
      const [customersRes, itemsRes] = await Promise.all([
        customersAPI.getAll(),
        itemsAPI.getAll()
      ])
      // Defensive: always use array
      const customersArr = Array.isArray(customersRes.data)
        ? customersRes.data
        : (Array.isArray(customersRes) ? customersRes : [])
      const itemsArr = Array.isArray(itemsRes.data)
        ? itemsRes.data
        : (Array.isArray(itemsRes) ? itemsRes : [])
      setCustomers(customersArr.filter(c => c.customerType === billingType))
      setItems(itemsArr)
    } catch (error) {
      setCustomers([])
      setItems([])
      toast.error('Failed to fetch data')
    }
  }

  const detectTaxType = async (customer) => {
    if (billingType !== 'B2B' || !customer?.state) {
      setTaxType('CGST_SGST')
      return
    }

    try {
      // Extract state code from customer state (format: "27-Maharashtra")
      const customerStateCode = customer.state.split('-')[0]

      const taxTypeResult = await gstAPI.getTaxType(companyStateCode, customerStateCode)
      setTaxType(taxTypeResult.taxType)

      // Show user-friendly message about tax type
      if (taxTypeResult.taxType === 'IGST') {
        toast('Inter-state transaction: IGST will be applied', {
          icon: 'ℹ️',
          duration: 3000
        })
      } else {
        toast('Intra-state transaction: CGST+SGST will be applied', {
          icon: 'ℹ️',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Failed to detect tax type:', error)
      // Fallback to manual detection
      const customerStateCode = customer.state?.split('-')[0]
      const isInterState = customerStateCode && customerStateCode !== companyStateCode
      setTaxType(isInterState ? 'IGST' : 'CGST_SGST')
    }
  }

  const handleCustomerChange = (customerId) => {
    setSelectedCustomer(customerId)

    if (customerId && billingType === 'B2B') {
      const customer = customers.find(c => c._id === customerId)
      if (customer) {
        detectTaxType(customer)
      }
    } else {
      setTaxType('CGST_SGST') // Default for B2C
    }
  }

  const handleAddItem = () => {
    const newItem = {
      id: Date.now() + Math.random(), // Unique identifier
      itemId: '',
      quantity: 1,
      item: null
    }
    setBillItems([...billItems, newItem])
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...billItems]
    if (field === 'itemId') {
      const selectedItem = items.find(i => i._id === value)
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
    const customer = customers.find(c => c._id === selectedCustomer)
    return customer
  }

  const getBillItemsWithTax = () => {
    const customer = getCustomerDetails()
    const isInterState = taxType === 'IGST'

    // Calculate total before discount for all items
    const totalBeforeDiscount = billItems.reduce((sum, billItem) => {
      if (!billItem.item) return sum
      const rate = Number(billItem.item.rate) || 0
      const quantity = Number(billItem.quantity) || 0
      return sum + (rate * quantity)
    }, 0)

    // Distribute discount amount proportionally to each item
    return billItems.map(billItem => {
      if (!billItem.item) return null
      
      const rate = Number(billItem.item.rate) || 0
      const quantity = Number(billItem.quantity) || 0
      const taxSlab = Number(billItem.item.taxSlab) || 0
      
      const itemTotal = rate * quantity
      const discountAmount = totalBeforeDiscount > 0 ? (itemTotal / totalBeforeDiscount) * Number(discountAmt || 0) : 0
      const taxableAmount = itemTotal - discountAmount
      const tax = calculateTax(taxableAmount, taxSlab, isInterState)

      return {
        ...billItem,
        itemTotal,
        discountAmount,
        taxableAmount,
        tax,
        totalWithTax: taxableAmount + (tax ? tax.total : 0)
      }
    }).filter(Boolean)
  }

  // Calculate totals with safe number handling
  const billItemsWithTax = getBillItemsWithTax()
  const totalBeforeTax = billItemsWithTax.reduce((sum, item) => {
    const taxableAmount = Number(item?.taxableAmount) || 0
    return sum + taxableAmount
  }, 0)
  const totalTax = billItemsWithTax.reduce((sum, item) => {
    const taxTotal = Number(item?.tax?.total) || 0
    return sum + taxTotal
  }, 0)
  const grandTotal = totalBeforeTax + totalTax + Number(shippingCharges || 0)
  const balance = grandTotal - Number(paidAmount || 0)

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
      // Prepare items for backend (include snapshot details)
      const itemsForBackend = billItemsWithTax.map(billItem => ({
        item: billItem.itemId,
        name: billItem.item.name,
        hsnCode: billItem.item.hsnCode,
        rate: billItem.item.rate,
        taxSlab: billItem.item.taxSlab,
        quantity: billItem.quantity,
        itemTotal: billItem.itemTotal,
        discountAmount: billItem.discountAmount,
        taxableAmount: billItem.taxableAmount,
        tax: billItem.tax,
        totalWithTax: billItem.totalWithTax
      }))

      const invoiceData = {
        customer: selectedCustomer,
        items: itemsForBackend,
        discount: Number(discountAmt),
        shippingCharges: Number(shippingCharges),
        totalBeforeTax: Number(totalBeforeTax),
        totalTax: Number(totalTax),
        grandTotal: Number(grandTotal),
        paidAmount: Number(paidAmount),
        balance: Number(balance),
        paymentMethod,
        billingType
      }

      const response = await billingAPI.createInvoice(invoiceData)
      toast.success('Invoice generated successfully!')
      navigate('/invoice-success', {
        state: {
          invoiceId: response.invoice?._id || response.invoiceId,
          pdfUrl: response.pdfPath || response.pdfUrl,
          upiQr: response.upiQr,
          balance: Number(grandTotal) - Number(paidAmount)
        }
      })
    } catch (error) {
      // Log error details for debugging
      if (error.response) {
        console.error('Invoice generation error:', error.response.data);
        toast.error(`Failed to generate invoice: ${error.response.data.message || 'Server error'}`);
      } else {
        console.error('Invoice generation error:', error);
        toast.error('Failed to generate invoice');
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Generate Invoice</h1>

          {/* Assignment Quick Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              onClick={() => navigate('/assignments', {
                state: {
                  prefilledTask: 'Invoice Processing Work',
                  assignmentType: 'billing',
                  relatedCustomer: selectedCustomer
                }
              })}
            >
              Assign Work
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              onClick={() => navigate('/assignments')}
            >
              Status
            </Button>
          </div>
        </div>

        {/* Billing Type Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setBillingType('B2B')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${billingType === 'B2B'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              B2B Invoice
            </button>
            <button
              onClick={() => setBillingType('B2C')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${billingType === 'B2C'
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
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {billingType === 'B2B' ? customer.firmName : customer.name} - {customer.contact}
                </option>
              ))}
            </select>
          </div>

          {/* Tax Type Indicator */}
          {selectedCustomer && billingType === 'B2B' && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-blue-800">
                  Tax Type: {taxType === 'IGST' ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)'}
                </span>
              </div>
            </div>
          )}

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
                  <div key={billItem.id || `item-${index}`} className="flex gap-4 items-end">
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
                          <option key={item._id} value={item._id}>
                            {item.name} - {formatCurrency(item.rate)} {item.units || 'per piece'} - {item.taxSlab}% GST
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

          {/* Discount, Shipping, and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <InputField
              label="Discount (₹)"
              type="number"
              value={discountAmt}
              onChange={(e) => setDiscountAmt(parseFloat(e.target.value) || 0)}
              min="0"
            />
            <InputField
              label="Shipping Charges (₹)"
              type="number"
              value={shippingCharges}
              onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
              min="0"
            />
            <InputField
              label="Paid Amount (₹)"
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              min="0"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          {billItems.some(item => item.item) && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Before Tax:</span>
                  <span>{formatCurrency(totalBeforeTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>- {formatCurrency(discountAmt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Charges:</span>
                  <span>{formatCurrency(shippingCharges)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span>{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total After Tax:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Balance:</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span>{paymentMethod}</span>
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