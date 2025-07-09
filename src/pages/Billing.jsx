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

  // Add Item Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    hsnCode: '',
    rate: '',
    taxSlab: 18, // Default GST rate
    units: 'per piece'
  })
  const [addingItem, setAddingItem] = useState(false)

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
      customRate: '', // Custom rate for this invoice only
      itemDiscount: 0, // Per-item discount
      item: null
    }
    setBillItems([...billItems, newItem])
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...billItems]
    if (field === 'itemId') {
      const selectedItem = items.find(i => i._id === value)
      updatedItems[index] = {
        ...updatedItems[index],
        itemId: value,
        item: selectedItem,
        customRate: selectedItem ? selectedItem.rate : '' // Initialize custom rate with original rate
      }
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

    return billItems.map(billItem => {
      if (!billItem.item) return null

      // Use custom rate if provided, otherwise use original item rate
      const rate = Number(billItem.customRate) || Number(billItem.item.rate) || 0
      const quantity = Number(billItem.quantity) || 0
      const taxSlab = Number(billItem.item.taxSlab) || 0
      const itemDiscount = Number(billItem.itemDiscount) || 0

      const itemTotal = rate * quantity
      const itemDiscountAmount = itemDiscount
      const subtotalAfterItemDiscount = itemTotal - itemDiscountAmount

      // Apply global discount proportionally only to the subtotal after item discount
      const totalBeforeGlobalDiscount = billItems.reduce((sum, bItem) => {
        if (!bItem.item) return sum
        const bRate = Number(bItem.customRate) || Number(bItem.item.rate) || 0
        const bQuantity = Number(bItem.quantity) || 0
        const bItemDiscount = Number(bItem.itemDiscount) || 0
        const bItemTotal = bRate * bQuantity
        return sum + (bItemTotal - bItemDiscount)
      }, 0)

      const globalDiscountAmount = totalBeforeGlobalDiscount > 0 ?
        (subtotalAfterItemDiscount / totalBeforeGlobalDiscount) * Number(discountAmt || 0) : 0

      const taxableAmount = subtotalAfterItemDiscount - globalDiscountAmount
      const tax = calculateTax(taxableAmount, taxSlab, isInterState)

      return {
        ...billItem,
        effectiveRate: rate, // Store the effective rate used
        itemTotal,
        itemDiscountAmount,
        globalDiscountAmount,
        totalDiscountAmount: itemDiscountAmount + globalDiscountAmount,
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
      // Prepare items for backend (include snapshot details with custom rates)
      const itemsForBackend = billItemsWithTax.map(billItem => ({
        item: billItem.itemId,
        name: billItem.item.name,
        hsnCode: billItem.item.hsnCode,
        originalRate: billItem.item.rate, // Store original rate
        rate: billItem.effectiveRate, // Use custom/effective rate for invoice
        taxSlab: billItem.item.taxSlab,
        quantity: billItem.quantity,
        itemDiscount: billItem.itemDiscountAmount,
        itemTotal: billItem.itemTotal,
        totalDiscountAmount: billItem.totalDiscountAmount,
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
      console.log('Invoice creation response:', response); // Debug log

      toast.success('Invoice generated successfully!')

      // Get customer details for WhatsApp
      const customerDetails = customers.find(c => c._id === selectedCustomer)

      // Create state object with fallback values
      const successState = {
        invoiceId: response.invoice?._id || response.invoiceId || response._id,
        invoiceNumber: response.invoice?.invoiceNumber || response.invoiceNumber,
        pdfUrl: response.pdfPath || response.pdfUrl || response.invoice?.pdfPath,
        upiQr: response.upiQr,
        balance: Number(grandTotal) - Number(paidAmount),
        // Pass data for WhatsApp integration
        customerData: customerDetails,
        invoiceData: {
          invoiceNumber: response.invoice?.invoiceNumber || response.invoiceNumber,
          grandTotal: Number(grandTotal),
          totalBeforeTax: Number(totalBeforeTax),
          totalTax: Number(totalTax),
          discount: Number(discountAmt),
          shippingCharges: Number(shippingCharges),
          paidAmount: Number(paidAmount),
          balance: Number(balance),
          paymentMethod,
          billingType,
          invoiceDate: new Date().toISOString()
        },
        items: billItemsWithTax.map(item => ({
          name: item.item.name,
          quantity: item.quantity,
          rate: item.effectiveRate,
          itemTotal: item.itemTotal,
          itemDiscount: item.itemDiscountAmount,
          tax: item.tax
        }))
      }

      console.log('Navigating to invoice-success with state:', successState); // Debug log

      navigate('/invoice-success', { state: successState })
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

  // Add Item functions
  const handleOpenAddItemModal = () => {
    setNewItem({
      name: '',
      hsnCode: '',
      rate: '',
      taxSlab: 18, // Default GST rate
      units: 'per piece'
    })
    setShowAddItemModal(true)
  }

  const handleCloseAddItemModal = () => {
    setShowAddItemModal(false)
    setNewItem({
      name: '',
      hsnCode: '',
      rate: '',
      taxSlab: 18,
      units: 'per piece'
    })
  }

  const handleNewItemChange = (field, value) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddNewItem = async () => {
    // Validation
    if (!newItem.name.trim()) {
      toast.error('Item name is required')
      return
    }
    if (!newItem.hsnCode.trim()) {
      toast.error('HSN code is required')
      return
    }
    if (!newItem.rate || parseFloat(newItem.rate) <= 0) {
      toast.error('Valid rate is required')
      return
    }
    if (!newItem.taxSlab || parseFloat(newItem.taxSlab) < 0) {
      toast.error('Valid tax slab is required')
      return
    }

    setAddingItem(true)
    try {
      const itemData = {
        name: newItem.name.trim(),
        hsnCode: newItem.hsnCode.trim(),
        rate: parseFloat(newItem.rate),
        taxSlab: parseFloat(newItem.taxSlab),
        units: newItem.units
      }

      const response = await itemsAPI.create(itemData)
      const createdItem = response.data || response

      // Add to items list
      setItems(prev => [...prev, createdItem])

      // Close modal
      handleCloseAddItemModal()

      toast.success('Item added successfully!')

    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item. Please try again.')
    } finally {
      setAddingItem(false)
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
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${isSelected ? 'bg-blue-50 text-blue-700' : ''
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
              <div className="flex gap-2">
                <Button
                  onClick={handleOpenAddItemModal}
                  variant="outline"
                  size="sm"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                >
                  New Item
                </Button>
                <Button onClick={handleAddItem} size="sm">
                  Add to Bill
                </Button>
              </div>
            </div>

            {billItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added</p>
            ) : (
              <div className="space-y-4">
                {billItems.map((billItem, index) => (
                  <div key={billItem.id || `item-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {/* Item Selection Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={billItem.itemId}
                          onChange={(e) => {
                            if (e.target.value === 'ADD_NEW_ITEM') {
                              handleOpenAddItemModal()
                            } else {
                              handleItemChange(index, 'itemId', e.target.value)
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select an item</option>
                          {items.map(item => (
                            <option key={item._id} value={item._id}>
                              {item.name} - {formatCurrency(item.rate)} {item.units || 'per piece'} - {item.taxSlab}% GST
                            </option>
                          ))}
                          <option value="ADD_NEW_ITEM" className="text-blue-600 font-medium">
                            ➕ Add New Item
                          </option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleRemoveItem(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </Button>
                      </div>
                    </div>

                    {/* Quantity, Rate, and Discounts Row */}
                    {billItem.item && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={billItem.quantity}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '')
                              handleItemChange(index, 'quantity', parseInt(value) || 1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="1"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rate (₹)
                            <span className="text-xs text-gray-500 ml-1">
                              (Original: {formatCurrency(billItem.item.rate)})
                            </span>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={billItem.customRate}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '')
                              handleItemChange(index, 'customRate', value)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder={billItem.item.rate}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Discount (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={billItem.itemDiscount || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '')
                              handleItemChange(index, 'itemDiscount', parseFloat(value) || 0)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="text-sm text-gray-600">
                            <div>Subtotal: {formatCurrency((Number(billItem.customRate) || Number(billItem.item.rate) || 0) * (Number(billItem.quantity) || 0))}</div>
                            {billItem.itemDiscount > 0 && (
                              <div className="text-green-600">Discount: -{formatCurrency(billItem.itemDiscount)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global Discount, Shipping, and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Global Discount (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={discountAmt || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '')
                  setDiscountAmt(parseFloat(value) || 0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Applied proportionally to all items</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Charges (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={shippingCharges || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '')
                  setShippingCharges(parseFloat(value) || 0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid Amount (₹)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={paidAmount || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '')
                  setPaidAmount(parseFloat(value) || 0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Enhanced Summary */}
          {billItems.some(item => item.item) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Invoice Summary</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {/* Item Details */}
                  <div className="space-y-2">
                    {billItemsWithTax.map((item, index) => (
                      <div key={item.id || index} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                        <div className="flex justify-between font-medium">
                          <span>{item.item.name} (x{item.quantity})</span>
                          <span>{formatCurrency(item.itemTotal)}</span>
                        </div>
                        {item.effectiveRate !== item.item.rate && (
                          <div className="flex justify-between text-blue-600 text-xs">
                            <span>Custom Rate: {formatCurrency(item.effectiveRate)} (Original: {formatCurrency(item.item.rate)})</span>
                          </div>
                        )}
                        {item.itemDiscountAmount > 0 && (
                          <div className="flex justify-between text-green-600 text-xs">
                            <span>Item Discount</span>
                            <span>-{formatCurrency(item.itemDiscountAmount)}</span>
                          </div>
                        )}
                        {item.globalDiscountAmount > 0 && (
                          <div className="flex justify-between text-orange-600 text-xs">
                            <span>Global Discount</span>
                            <span>-{formatCurrency(item.globalDiscountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Taxable Amount</span>
                          <span>{formatCurrency(item.taxableAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-gray-300 pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal (After Discounts):</span>
                      <span>{formatCurrency(totalBeforeTax)}</span>
                    </div>

                    {/* Total Discounts */}
                    {(billItemsWithTax.some(item => item.itemDiscountAmount > 0) || discountAmt > 0) && (
                      <div className="bg-green-50 p-2 rounded text-sm">
                        <div className="font-medium text-green-800 mb-1">Discount Breakdown:</div>
                        {billItemsWithTax.some(item => item.itemDiscountAmount > 0) && (
                          <div className="flex justify-between text-green-700">
                            <span>Item Discounts:</span>
                            <span>-{formatCurrency(billItemsWithTax.reduce((sum, item) => sum + item.itemDiscountAmount, 0))}</span>
                          </div>
                        )}
                        {discountAmt > 0 && (
                          <div className="flex justify-between text-green-700">
                            <span>Global Discount:</span>
                            <span>-{formatCurrency(discountAmt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium text-green-800 border-t border-green-200 pt-1">
                          <span>Total Discount:</span>
                          <span>-{formatCurrency(billItemsWithTax.reduce((sum, item) => sum + item.totalDiscountAmount, 0))}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Tax Amount ({taxType === 'IGST' ? 'IGST' : 'CGST + SGST'}):</span>
                      <span>{formatCurrency(totalTax)}</span>
                    </div>

                    {shippingCharges > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping Charges:</span>
                        <span>{formatCurrency(shippingCharges)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(grandTotal)}</span>
                    </div>

                    {paidAmount > 0 && (
                      <>
                        <div className="flex justify-between text-blue-600">
                          <span>Paid Amount ({paymentMethod}):</span>
                          <span>{formatCurrency(paidAmount)}</span>
                        </div>
                        <div className={`flex justify-between font-medium ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          <span>{balance > 0 ? 'Balance Due:' : balance < 0 ? 'Excess Paid:' : 'Fully Paid:'}</span>
                          <span>{balance > 0 ? formatCurrency(balance) : balance < 0 ? formatCurrency(Math.abs(balance)) : '₹0'}</span>
                        </div>
                      </>
                    )}
                  </div>
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
              placeholder="Enter contact number (for WhatsApp notifications)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              📱 We'll use this number for WhatsApp invoice notifications
            </p>
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

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItemModal}
        onRequestClose={handleCloseAddItemModal}
        contentLabel="Add Item"
        className="max-w-lg mx-auto p-6 rounded-lg shadow-lg bg-white"
      >
        <h2 className="text-xl font-semibold mb-4">Add New Item</h2>

        <div className="space-y-4">
          <div>
            <InputField
              label="Item Name"
              value={newItem.name}
              onChange={(e) => handleNewItemChange('name', e.target.value)}
              placeholder="Enter item name"
              required
            />
          </div>
          <div>
            <InputField
              label="HSN Code"
              value={newItem.hsnCode}
              onChange={(e) => handleNewItemChange('hsnCode', e.target.value)}
              placeholder="Enter HSN code (e.g., 1234, 5678)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={newItem.rate}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '')
                handleNewItemChange('rate', value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Enter rate per unit"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax Slab (%) <span className="text-red-500">*</span>
            </label>
            <select
              value={newItem.taxSlab}
              onChange={(e) => handleNewItemChange('taxSlab', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="0">0% - Exempt</option>
              <option value="3">3% - GST</option>
              <option value="5">5% - GST</option>
              <option value="12">12% - GST</option>
              <option value="18">18% - GST</option>
              <option value="28">28% - GST</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Units <span className="text-red-500">*</span>
            </label>
            <select
              value={newItem.units}
              onChange={(e) => handleNewItemChange('units', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="per piece">per piece</option>
              <option value="per ft">per ft</option>
              <option value="per roll">per roll</option>
              <option value="per sqft">per sqft</option>
              <option value="per box">per box</option>
              <option value="per set">per set</option>
              <option value="per gram">per gram</option>
              <option value="per kg">per kg</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            onClick={handleCloseAddItemModal}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddNewItem}
            variant="primary"
            size="sm"
            loading={addingItem}
          >
            Add Item
          </Button>
        </div>
      </Modal>
    </Layout>
  )
}

export default Billing