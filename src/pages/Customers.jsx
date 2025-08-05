import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import Table from '../components/Table'
import Button from '../components/Button'
import { customersAPI } from '../api/customers'
import AddCustomerModal from '../components/AddCustomerModal'

const Customers = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('B2B')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)

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

  const handleCustomerAdded = (newCustomer) => {
    setCustomers((prev) => [...prev, newCustomer])
    fetchCustomers() // Re-fetch to ensure data is in sync
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer)
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
  }

  const filteredCustomers = customers.filter(c => c.customerType === activeTab)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex gap-3">
            <Button onClick={() => setIsModalOpen(true)}>
              Add Customer
            </Button>
          </div>
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
        <AddCustomerModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onCustomerAdded={handleCustomerAdded}
          customerType={activeTab}
          editingCustomer={editingCustomer}
        />
      </div>
    </Layout>
  )
}

export default Customers


