import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import InputField from '../components/InputField'
import Button from '../components/Button'
import Modal from '../components/Modal'
import AddCustomerModal from '../components/AddCustomerModal'
import { customersAPI } from '../api/customers'
import { itemsAPI } from '../api/items'
import { billingAPI } from '../api/billing'
import { gstAPI } from '../api/gst'
import { calculateTax } from '../utils/taxCalculations'
import { formatCurrency } from '../utils/dateHelpers'
import BillItemRow from '../components/BillItemRow'

const Billing = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editInvoiceId = searchParams.get('edit')
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

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)

  // Add Customer Modal states
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)

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

  

  

  useEffect(() => {
    fetchData()
  }, [billingType])

  // Check for edit mode and load invoice data
  useEffect(() => {
    if (editInvoiceId && customers.length > 0 && items.length > 0 && !editingInvoice && !loading) {
      setIsEditMode(true)
      loadInvoiceForEditing(editInvoiceId)
    }
  }, [editInvoiceId, customers, items])

  

  

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

  // Load invoice data for editing
  const loadInvoiceForEditing = async (invoiceId) => {
    if (loading) {
      return
    }

    try {
      setLoading(true)

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000)
      )

      const response = await Promise.race([
        billingAPI.getInvoiceById(invoiceId),
        timeoutPromise
      ])

      const invoice = response.data || response

      if (invoice) {
        setEditingInvoice(invoice)

        let customer = customers.find(c => c._id === invoice.customer || c._id === invoice.customer?._id)

        if (!customer && invoice.customer) {
          customer = typeof invoice.customer === 'object' ? invoice.customer : null
          if (customer && customer._id) {
            setCustomers(prev => {
              const exists = prev.find(c => c._id === customer._id)
              if (!exists) {
                return [...prev, customer]
              }
              return prev
            })
          }
        }

        if (customer) {
          setBillingType(customer.customerType)
          setSelectedCustomer(customer._id)
          const displayName = customer.customerType === 'B2B' ? customer.firmName : customer.name
          const searchText = `${displayName} - ${customer.contact}`
          setCustomerSearch(searchText)
          if (customer.customerType === 'B2B') {
            detectTaxType(customer)
          }
        }

        const mappedItems = (invoice.items || []).map((invoiceItem) => {
          const fullItem = items.find(item =>
            item._id === invoiceItem.item ||
            item._id === invoiceItem.item?._id ||
            item.name === invoiceItem.name
          )

          return {
            id: Date.now() + Math.random(), // Assign a unique ID for the BillItemRow key
            item: fullItem || {
              _id: invoiceItem.item || invoiceItem.item?._id,
              name: invoiceItem.name,
              hsnCode: invoiceItem.hsnCode,
              rate: invoiceItem.originalRate || invoiceItem.rate,
              taxSlab: invoiceItem.taxSlab,
              units: invoiceItem.units || 'per piece'
            },
            itemId: fullItem?._id || invoiceItem.item || invoiceItem.item?._id,
            quantity: invoiceItem.quantity || 1,
            customRate: invoiceItem.rate !== invoiceItem.originalRate ? invoiceItem.rate : '',
            effectiveRate: invoiceItem.rate,
            itemDiscountAmount: invoiceItem.itemDiscount || 0,
            searchValue: fullItem ? `${fullItem.name} - ${formatCurrency(fullItem.rate)} ${fullItem.units || 'per piece'} - ${fullItem.taxSlab}% GST` : ''
          }
        })

        setBillItems(mappedItems)
        setDiscountAmt(invoice.discountAmt || invoice.discount || 0)
        setShippingCharges(invoice.shippingCharges || 0)
        setPaidAmount(invoice.paidAmount || invoice.receivedAmount || 0)
        setPaymentMethod(invoice.paymentMethod || 'UPI')

        toast.success('Invoice loaded for editing!')
      } else {
        toast.error('No invoice data found')
        navigate('/invoices')
      }
    } catch (error) {
      console.error('Failed to load invoice for editing:', error)
      if (error.message === 'Request timeout after 15 seconds') {
        toast.error('Request timed out. Please check your connection and try again.')
      } else if (error.response?.status === 404) {
        toast.error('Invoice not found')
      } else if (error.response?.data?.message) {
        toast.error(`Error: ${error.response.data.message}`)
      } else {
        toast.error('Failed to load invoice data')
      }
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  

  const handleAddItem = () => {
    const newItem = {
      id: Date.now() + Math.random(), // Unique identifier
      itemId: '',
      quantity: 1,
      customRate: '', // Custom rate for this invoice only
      itemDiscount: 0, // Per-item discount
      item: null,
      searchValue: '' // For search functionality
    }
    setBillItems([...billItems, newItem])
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...billItems]
    updatedItems[index][field] = value
    setBillItems(updatedItems)
  }

  const handleRemoveItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index))
  }

  

  const getBillItemsWithTax = () => {
    const customer = customers.find(c => c._id === selectedCustomer)
    const isInterState = taxType === 'IGST'

    // Calculate total before global discount once
    const totalBeforeGlobalDiscount = billItems.reduce((sum, bItem) => {
      if (!bItem.item) return sum
      const bRate = Number(bItem.customRate) || Number(bItem.item.rate) || 0
      const bQuantity = Number(bItem.quantity) || 0
      const bItemDiscount = Number(bItem.itemDiscount) || 0
      return sum + (bRate * bQuantity - bItemDiscount)
    }, 0)

    return billItems.map(billItem => {
      if (!billItem.item) return null

      const rate = Number(billItem.customRate) || Number(billItem.item.rate) || 0
      const quantity = Number(billItem.quantity) || 0
      const taxSlab = Number(billItem.item.taxSlab) || 0
      const itemDiscount = Number(billItem.itemDiscount) || 0

      const itemTotal = rate * quantity
      const subtotalAfterItemDiscount = itemTotal - itemDiscount

      const globalDiscountAmount = totalBeforeGlobalDiscount > 0 ?
        (subtotalAfterItemDiscount / totalBeforeGlobalDiscount) * Number(discountAmt || 0) : 0

      const taxableAmount = subtotalAfterItemDiscount - globalDiscountAmount
      const tax = calculateTax(taxableAmount, taxSlab, isInterState)

      return {
        ...billItem,
        effectiveRate: rate,
        itemTotal,
        itemDiscountAmount: itemDiscount,
        globalDiscountAmount,
        totalDiscountAmount: itemDiscount + globalDiscountAmount,
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
        paidAmount: Number(paidAmount),
        balance: Number(balance),
        paymentMethod,
        billingType
      }

      let response
      if (isEditMode && editingInvoice) {
        // Update existing invoice
        response = await billingAPI.updateInvoice(editingInvoice._id, invoiceData)
        toast.success('Invoice updated successfully!')
      } else {
        // Create new invoice
        response = await billingAPI.createInvoice(invoiceData)
        toast.success('Invoice generated successfully!')
      }

      // Get customer details for WhatsApp
      const customerDetails = customers.find(c => c._id === selectedCustomer)

      // Create state object with fallback values
      const successState = {
        invoiceId: response.invoice?._id || response.invoiceId || response._id || editingInvoice?._id,
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
          itemTotal: item.item.itemTotal,
          itemDiscount: item.itemDiscountAmount,
          tax: item.tax
        }))
      }

      // Show success message and give user option to stay or go to success page
      toast.success(
        <div className="text-sm">
          <p className="semibold">Invoice #{response.invoiceNumber} generated successfully!</p>
          <p className="text-xs mt-1">PDF download should start automatically.</p>
        </div>,
        { 
          duration: 4000,
          icon: '🎉'
        }
      );

      // Auto-redirect to success page after a short delay
      setTimeout(() => {
        navigate('/invoice-success', { state: successState })
      }, 1500)
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

  const handleCustomerAdded = (newCustomer) => {
    setCustomers((prev) => [...prev, newCustomer])
    // Auto-select the newly created customer
    const displayName = billingType === 'B2B' ? newCustomer.firmName : newCustomer.name
    const searchText = `${displayName} - ${newCustomer.contact}`
    setCustomerSearch(searchText)
    setSelectedCustomer(newCustomer._id)
    // setShowCustomerDropdown(false) // No longer needed as CustomerSelect manages its own dropdown state

    if (billingType === 'B2B') {
      detectTaxType(newCustomer)
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
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              {isEditMode ? 'Edit Invoice' : 'Generate Invoice'}
            </h1>
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditMode(false)
                  setEditingInvoice(null)
                  navigate('/invoices')
                }}
                className="text-gray-600 hover:text-gray-800 hidden sm:inline-flex"
              >
                ← Back to Invoices
              </Button>
            )}
          </div>
        </div>

        {/* Billing Type Tabs - Hide in edit mode - Mobile optimized */}
        {!isEditMode && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => {
                  setBillingType('B2B')
                  clearCustomerSelection() // Clear search when switching billing type
                }}
                className={`flex-1 py-3 px-1 border-b-2 font-medium text-sm text-center ${billingType === 'B2B'
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
                className={`flex-1 py-3 px-1 border-b-2 font-medium text-sm text-center ${billingType === 'B2C'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                B2C Invoice
              </button>
            </nav>
          </div>
        )}

        {/* Edit Mode Indicator */}
        {isEditMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Editing Invoice: {editingInvoice?.invoiceNumber || 'Unknown'}
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  You are editing an existing {billingType} invoice. Make your changes and click "Update Invoice" to save.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          {/* Customer Selection */}
          <CustomerSelect
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={handleCustomerSelect}
            onClearSelection={clearCustomerSelection}
            billingType={billingType}
            onAddCustomerClick={() => setShowAddCustomerModal(true)}
            isEditMode={isEditMode}
            editingInvoiceCustomer={editingInvoice?.customer}
          />

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

          {/* Items Section - Mobile optimized */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleOpenAddItemModal}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                >
                  New Item
                </Button>
              </div>
            </div>

            {billItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added</p>
            ) : (
              <div className="space-y-4">
                {billItems.map((billItem, index) => (
                  <BillItemRow
                    key={billItem.id || `item-${index}`}
                    billItem={billItem}
                    index={index}
                    items={items}
                    onItemChange={handleItemChange}
                    onRemoveItem={handleRemoveItem}
                  />
                ))}
              </div>
            )}
            
            {/* Add New Row Button - Bottom of items section */}
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleAddItem}
                variant="outline"
                size="sm"
                className="px-6"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Add New Row
              </Button>
            </div>
          </div>

          {/* Global Discount, Shipping, and Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
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
                {loading ? (isEditMode ? 'Updating...' : 'Generating...') : (isEditMode ? 'Update Invoice' : 'Generate Invoice')}
              </Button>
            </div>
          </div>
        </div>

        {/* Add Customer Modal */}
        <AddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerAdded={handleCustomerAdded}
          customerType={billingType}
        />

        {/* Add Item Modal */}
        <Modal
          isOpen={showAddItemModal}
          onClose={handleCloseAddItemModal}
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
