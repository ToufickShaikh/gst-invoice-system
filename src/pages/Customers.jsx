import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import Table from '../components/Table'
import Modal from '../components/Modal'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { customersAPI } from '../api/customers'
import { gstAPI } from '../api/gst'

const Customers = () => {
  const [activeTab, setActiveTab] = useState('B2B')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState({
    customerType: 'B2B',
    firmName: '',
    gstNo: '',
    firmAddress: '',
    contact: '',
    name: '',
    state: '33-Tamil Nadu' // Default state
  })
  const [gstinValidating, setGstinValidating] = useState(false)
  const [gstinValid, setGstinValid] = useState(null)
  const [gstinDetails, setGstinDetails] = useState(null)

  const b2bColumns = [
    { key: 'firmName', label: 'Firm Name' },
    { key: 'gstNo', label: 'GST No.' },
    { key: 'firmAddress', label: 'Address' },
    { key: 'contact', label: 'Contact' }
  ]

  const b2cColumns = [
    { key: 'name', label: 'Name' },
    { key: 'contact', label: 'Contact' }
  ]

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const response = await customersAPI.getAll(activeTab)
      // Defensive: always set to array
      if (Array.isArray(response.data)) {
        setCustomers(response.data)
      } else if (Array.isArray(response)) {
        setCustomers(response)
      } else {
        setCustomers([])
      }
    } catch (error) {
      setCustomers([])
      toast.error('Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [activeTab])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Handle GSTIN validation for B2B customers
    if (name === 'gstNo' && activeTab === 'B2B' && value.length >= 15) {
      validateAndVerifyGSTIN(value)
    } else if (name === 'gstNo') {
      // Reset validation state if GSTIN is incomplete
      setGstinValid(null)
      setGstinDetails(null)
    }
  }

  const validateAndVerifyGSTIN = async (gstin) => {
    setGstinValidating(true)
    setGstinValid(null)
    setGstinDetails(null)

    try {
      // First validate format
      const validationResult = await gstAPI.validateGSTIN(gstin)

      if (validationResult.valid) {
        setGstinValid(true)

        // Then verify and get details
        const verificationResult = await gstAPI.verifyGSTIN(gstin)

        console.log('🔍 Frontend received verification result:', verificationResult)
        console.log('🔍 Company details:', verificationResult?.companyDetails)

        if (verificationResult.verified && verificationResult.companyDetails) {
          setGstinDetails(verificationResult.companyDetails)

          console.log('📝 Auto-filling form with:')
          console.log('  - Firm Name:', verificationResult.companyDetails.legalName)
          console.log('  - Address:', verificationResult.companyDetails.principalPlaceOfBusiness)
          console.log('  - State:', verificationResult.companyDetails.state)

          // Auto-fill form data with verified details
          setFormData(prev => ({
            ...prev,
            firmName: verificationResult.companyDetails.legalName || prev.firmName,
            firmAddress: verificationResult.companyDetails.principalPlaceOfBusiness || prev.firmAddress,
            state: verificationResult.companyDetails.state || prev.state
          }))

          toast.success('GSTIN verified successfully! Details auto-filled.')
        } else {
          console.log('❌ Verification failed or missing company details')
          console.log('  - Verified:', verificationResult.verified)
          console.log('  - Has companyDetails:', !!verificationResult.companyDetails)
          toast.warning('GSTIN format is valid but verification failed. Please enter details manually.')
        }
      } else {
        setGstinValid(false)
        toast.error('Invalid GSTIN format')
      }
    } catch (error) {
      setGstinValid(false)
      console.error('GSTIN validation error:', error)

      // More specific error messages
      if (error.response?.status === 404) {
        toast.error('GST verification service is not available. Please enter details manually.')
      } else if (error.response?.status === 500) {
        toast.error('GST verification service error. Please try again later.')
      } else if (error.message?.includes('Network Error')) {
        toast.error('Network error. Please check your connection and try again.')
      } else {
        toast.error('GSTIN validation failed. Please enter details manually.')
      }
    } finally {
      setGstinValidating(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData, customerType: activeTab };
      if (editingCustomer) {
        await customersAPI.update(editingCustomer._id, payload)
        toast.success('Customer updated successfully')
      } else {
        await customersAPI.create(payload)
        toast.success('Customer added successfully')
      }
      fetchCustomers()
      handleCloseModal()
    } catch (error) {
      toast.error('Operation failed')
    }
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      customerType: customer.customerType,
      firmName: customer.firmName || '',
      gstNo: customer.gstNo || '',
      firmAddress: customer.firmAddress || '',
      contact: customer.contact || '',
      name: customer.name || '',
      state: customer.state || '33-Tamil Nadu'
    })
    // Reset GSTIN validation state for editing
    setGstinValidating(false)
    setGstinValid(null)
    setGstinDetails(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (customer) => {
    if (window.confirm('Are you sure you want to delete this customer? This will also delete all of their invoices.')) {
      try {
        await customersAPI.delete(customer._id)
        toast.success('Customer and all associated invoices deleted.')
        fetchCustomers()
      } catch (error) {
        toast.error('Failed to delete customer.')
      }
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCustomer(null)
    setFormData({
      customerType: activeTab,
      firmName: '',
      gstNo: '',
      firmAddress: '',
      contact: '',
      name: '',
      state: '33-Tamil Nadu'
    })
    // Reset GSTIN validation state
    setGstinValidating(false)
    setGstinValid(null)
    setGstinDetails(null)
  }

  const filteredCustomers = customers.filter(c => c.customerType === activeTab)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Customers</h1>
          <Button onClick={() => setIsModalOpen(true)}>
            Add Customer
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('B2B')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'B2B'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              B2B Customers
            </button>
            <button
              onClick={() => setActiveTab('B2C')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'B2C'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              B2C Customers
            </button>
          </nav>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table
              columns={activeTab === 'B2B' ? b2bColumns : b2cColumns}
              data={filteredCustomers}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`${editingCustomer ? 'Edit' : 'Add'} ${activeTab} Customer`}
        >
          <form onSubmit={handleSubmit}>
            {activeTab === 'B2B' ? (
              <>
                <InputField
                  label="Firm Name"
                  name="firmName"
                  value={formData.firmName}
                  onChange={handleChange}
                  required
                />
                <div className="relative">
                  <InputField
                    label="GST Number"
                    name="gstNo"
                    value={formData.gstNo}
                    onChange={handleChange}
                    required
                    placeholder="Enter 15-digit GSTIN (e.g., 27XXXXX0000X1Z5)"
                  />
                  {/* GSTIN Validation Status */}
                  {formData.gstNo && formData.gstNo.length >= 15 && (
                    <div className="absolute right-3 top-9 flex items-center">
                      {gstinValidating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      ) : gstinValid === true ? (
                        <div className="text-green-500 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : gstinValid === false ? (
                        <div className="text-red-500 text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {/* GSTIN Details Preview */}
                  {gstinDetails && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Verified:</strong> {gstinDetails.legalName}
                      </p>
                      <p className="text-sm text-green-700">
                        State: {gstinDetails.state}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Details auto-filled below
                      </p>
                    </div>
                  )}
                </div>
                <InputField
                  label="Address"
                  name="firmAddress"
                  value={formData.firmAddress}
                  onChange={handleChange}
                  required
                />
              </>
            ) : (
              <InputField
                label="Customer Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            )}
            <InputField
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="e.g., 33-Tamil Nadu"
              required
            />
            <InputField
              label="Contact Number"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              required
            />
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingCustomer ? 'Update' : 'Add'} Customer
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

export default Customers


