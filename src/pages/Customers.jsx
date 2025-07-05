import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import Table from '../components/Table'
import Modal from '../components/Modal'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { customersAPI } from '../api/customers'

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
    name: ''
  })

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
    setFormData({ ...formData, [e.target.name]: e.target.value })
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
      name: customer.name || ''
    })
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
      name: ''
    })
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
                <InputField
                  label="GST Number"
                  name="gstNo"
                  value={formData.gstNo}
                  onChange={handleChange}
                  required
                />
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


