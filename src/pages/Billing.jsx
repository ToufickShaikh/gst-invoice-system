import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import InputField from '../components/InputField'
import Button from '../components/Button'
import Modal from '../components/Modal'
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

  // Add Customer Modal states
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    firmName: '',
    firmAddress: '',
    contact: '',
    email: '',
    gstNo: '',
    state: '',
    customerType: 'B2C'
  })
  const [addingCustomer, setAddingCustomer] = useState(false)

  // Searchable Customer Dropdown states
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState([])

  useEffect(() => {
    fetchData()
  }, [billingType])

  // Filter customers based on search term
  useEffect(() => {
    if (!customerSearch.trim()) {
      setFilteredCustomers(customers)
    } else {
      const searchTerm = customerSearch.toLowerCase()
      const filtered = customers.filter(customer => {
        const name = billingType === 'B2B' ? customer.firmName : customer.name
        const contact = customer.contact || ''
        const email = customer.email || ''
        
        return (
          name?.toLowerCase().includes(searchTerm) ||
          contact.includes(searchTerm) ||
          email.toLowerCase().includes(searchTerm)
        )
      })
      setFilteredCustomers(filtered)
    }
  }, [customers, customerSearch, billingType])

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

  const handleCustomerSearchChange = (value) => {
    setCustomerSearch(value)
    setShowCustomerDropdown(true)
    if (!value.trim()) {
      setSelectedCustomer('')
    }
  }

  const handleCustomerSelect = (customer) => {
    const displayName = billingType === 'B2B' ? customer.firmName : customer.name
    setCustomerSearch(`${displayName} - ${customer.contact}`)
    setSelectedCustomer(customer._id)
    setShowCustomerDropdown(false)
    
    if (billingType === 'B2B') {
      detectTaxType(customer)
    } else {
      setTaxType('CGST_SGST')
    }
  }

  const clearCustomerSelection = () => {
    setCustomerSearch('')
    setSelectedCustomer('')
    setShowCustomerDropdown(false)
    setTaxType('CGST_SGST')
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

  // Add Customer functions
  const handleOpenAddCustomerModal = () => {
    setNewCustomer({
      name: '',
      firmName: '',
      firmAddress: '',
      contact: '',
      email: '',
      gstNo: '',
      state: '',
      customerType: billingType
    })
    setShowAddCustomerModal(true)
  }

  const handleCloseAddCustomerModal = () => {
    setShowAddCustomerModal(false)
    setNewCustomer({
      name: '',
      firmName: '',
      firmAddress: '',
      contact: '',
      email: '',
      gstNo: '',
      state: '',
      customerType: 'B2C'
    })
  }

  const handleNewCustomerChange = (field, value) => {
    setNewCustomer(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddNewCustomer = async () => {
    // Validation
    if (billingType === 'B2B') {
      if (!newCustomer.firmName.trim()) {
        toast.error('Firm name is required for B2B customers')
        return
      }
      if (!newCustomer.firmAddress.trim()) {
        toast.error('Firm address is required for B2B customers')
        return
      }
    } else {
      if (!newCustomer.name.trim()) {
        toast.error('Customer name is required')
        return
      }
    }

    if (!newCustomer.contact.trim()) {
      toast.error('Contact number is required')
      return
    }

    setAddingCustomer(true)
    try {
      const customerData = {
        ...newCustomer,
        customerType: billingType
      }

      const response = await customersAPI.create(customerData)
      const createdCustomer = response.data || response

      // Add to customers list
      setCustomers(prev => [...prev, createdCustomer])
      
      // Auto-select the newly created customer in searchable dropdown
      const displayName = billingType === 'B2B' ? createdCustomer.firmName : createdCustomer.name
      setCustomerSearch(`${displayName} - ${createdCustomer.contact}`)
      setSelectedCustomer(createdCustomer._id)
      setShowCustomerDropdown(false)
      
      // Close modal
      handleCloseAddCustomerModal()
      
      toast.success(`${billingType} customer added successfully!`)
      
      // Detect tax type for B2B customers
      if (billingType === 'B2B' && createdCustomer) {
        detectTaxType(createdCustomer)
      }
      
    } catch (error) {
      console.error('Error adding customer:', error)
      toast.error('Failed to add customer. Please try again.')
    } finally {
      setAddingCustomer(false)
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
              onClick={() => {
                setBillingType('B2B')
                clearCustomerSelection() // Clear search when switching billing type
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${billingType === 'B2B'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              B2B Invoice
            </button>
            <button
              onClick={() => {
                setBillingType('B2C')
                clearCustomerSelection() // Clear search when switching billing type
              }}
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
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearchChange(e.target.value)}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={`Search customers by ${billingType === 'B2B' ? 'firm name' : 'name'}, contact, or email...`}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedCustomer && (
                    <button
                      onClick={clearCustomerSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {!selectedCustomer && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => {
                        const displayName = billingType === 'B2B' ? customer.firmName : customer.name
                        const isSelected = selectedCustomer === customer._id
                        
                        return (
                          <div
                            key={customer._id}
                            onClick={() => handleCustomerSelect(customer)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              isSelected ? 'bg-blue-50 text-blue-700' : ''
                            }`}
                          >
                            <div className="font-medium">{displayName}</div>
                            <div className="text-sm text-gray-500">
                              {customer.contact}
                              {customer.email && ` • ${customer.email}`}
                              {billingType === 'B2B' && customer.gstNo && ` • GST: ${customer.gstNo}`}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-3 py-4 text-center text-gray-500">
                        {customerSearch.trim() ? 'No customers found' : 'Start typing to search customers'}
                      </div>
                    )}
                    
                    {/* Add Customer Option */}
                    <div
                      onClick={() => {
                        setShowCustomerDropdown(false)
                        handleOpenAddCustomerModal()
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-t border-gray-200 text-blue-600 font-medium"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New Customer
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Click outside handler */}
                {showCustomerDropdown && (
                  <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowCustomerDropdown(false)}
                  />
                )}
              </div>
              
              <Button
                onClick={handleOpenAddCustomerModal}
                variant="primary"
                size="sm"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3v18" />
                  </svg>
                }
              >
                Add Customer
              </Button>
            </div>
            
            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Customer Selected</span>
                </div>
              </div>
            )}
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

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddCustomerModal}
        onRequestClose={handleCloseAddCustomerModal}
        contentLabel="Add Customer"
        className="max-w-lg mx-auto p-6 rounded-lg shadow-lg bg-white"
      >
        <h2 className="text-xl font-semibold mb-4">
          {billingType === 'B2B' ? 'Add B2B Customer' : 'Add B2C Customer'}
        </h2>

        <div className="space-y-4">
          {billingType === 'B2B' && (
            <div>
              <InputField
                label="Firm Name"
                value={newCustomer.firmName}
                onChange={(e) => handleNewCustomerChange('firmName', e.target.value)}
                placeholder="Enter firm name"
                required
              />
              <InputField
                label="Firm Address"
                value={newCustomer.firmAddress}
                onChange={(e) => handleNewCustomerChange('firmAddress', e.target.value)}
                placeholder="Enter firm address"
                required
              />
            </div>
          )}
          <div>
            <InputField
              label="Customer Name"
              value={newCustomer.name}
              onChange={(e) => handleNewCustomerChange('name', e.target.value)}
              placeholder="Enter customer name"
              required={billingType === 'B2C'}
            />
          </div>
          <div>
            <InputField
              label="Contact Number"
              value={newCustomer.contact}
              onChange={(e) => handleNewCustomerChange('contact', e.target.value)}
              placeholder="Enter contact number"
              required
            />
          </div>
          <div>
            <InputField
              label="Email"
              value={newCustomer.email}
              onChange={(e) => handleNewCustomerChange('email', e.target.value)}
              placeholder="Enter email address"
              type="email"
            />
          </div>
          {billingType === 'B2B' && (
            <div>
              <InputField
                label="GST Number"
                value={newCustomer.gstNo}
                onChange={(e) => handleNewCustomerChange('gstNo', e.target.value)}
                placeholder="Enter GST number"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              value={newCustomer.state}
              onChange={(e) => handleNewCustomerChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select state</option>
              <option value="01-Jammu and Kashmir">01 - Jammu and Kashmir</option>
              <option value="02-Himachal Pradesh">02 - Himachal Pradesh</option>
              <option value="03-Punjab">03 - Punjab</option>
              <option value="04-Chandigarh">04 - Chandigarh</option>
              <option value="05-Uttarakhand">05 - Uttarakhand</option>
              <option value="06-Haryana">06 - Haryana</option>
              <option value="07-Delhi">07 - Delhi</option>
              <option value="08-Rajasthan">08 - Rajasthan</option>
              <option value="09-Uttar Pradesh">09 - Uttar Pradesh</option>
              <option value="10-Bihar">10 - Bihar</option>
              <option value="11-Sikkim">11 - Sikkim</option>
              <option value="12-Arunachal Pradesh">12 - Arunachal Pradesh</option>
              <option value="13-Nagaland">13 - Nagaland</option>
              <option value="14-Manipur">14 - Manipur</option>
              <option value="15-Mizoram">15 - Mizoram</option>
              <option value="16-Tripura">16 - Tripura</option>
              <option value="17-Meghalaya">17 - Meghalaya</option>
              <option value="18-Assam">18 - Assam</option>
              <option value="19-West Bengal">19 - West Bengal</option>
              <option value="20-Jharkhand">20 - Jharkhand</option>
              <option value="21-Odisha">21 - Odisha</option>
              <option value="22-Chhattisgarh">22 - Chhattisgarh</option>
              <option value="23-Madhya Pradesh">23 - Madhya Pradesh</option>
              <option value="24-Gujarat">24 - Gujarat</option>
              <option value="25-Daman and Diu">25 - Daman and Diu</option>
              <option value="26-Dadra and Nagar Haveli">26 - Dadra and Nagar Haveli</option>
              <option value="27-Maharashtra">27 - Maharashtra</option>
              <option value="28-Andhra Pradesh">28 - Andhra Pradesh</option>
              <option value="29-Karnataka">29 - Karnataka</option>
              <option value="30-Goa">30 - Goa</option>
              <option value="31-Lakshadweep">31 - Lakshadweep</option>
              <option value="32-Kerala">32 - Kerala</option>
              <option value="33-Tamil Nadu">33 - Tamil Nadu</option>
              <option value="34-Puducherry">34 - Puducherry</option>
              <option value="35-Andaman and Nicobar Islands">35 - Andaman and Nicobar Islands</option>
              <option value="36-Telangana">36 - Telangana</option>
              <option value="37-Ladakh">37 - Ladakh</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            onClick={handleCloseAddCustomerModal}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddNewCustomer}
            variant="primary"
            size="sm"
            loading={addingCustomer}
          >
            Add Customer
          </Button>
        </div>
      </Modal>
    </Layout>
  )
}

export default Billing