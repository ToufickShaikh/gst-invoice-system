import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import Table from '../components/Table'
import Modal from '../components/Modal'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { itemsAPI } from '../api/items'
import { formatCurrency } from '../utils/dateHelpers'

const Items = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    hsnCode: '',
    rate: '',
    taxSlab: '',
    units: 'per piece'
  })

  const columns = [
    { key: 'name', label: 'Item Name' },
    { key: 'hsnCode', label: 'HSN Code' },
    { key: 'formattedRate', label: 'Rate' },
    { key: 'units', label: 'Units' },
    { key: 'taxSlabDisplay', label: 'Tax Slab' }
  ]

  const fetchItems = async () => {
    setLoading(true)
    try {
      const response = await itemsAPI.getAll()
      // Defensive: always use array
      const itemsArr = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response) ? response : [])
      const formattedItems = itemsArr.map(item => ({
        ...item,
        formattedRate: formatCurrency(item.rate),
        taxSlabDisplay: `${item.taxSlab}%`
      }))
      setItems(formattedItems)
    } catch (error) {
      setItems([])
      toast.error('Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const itemData = {
      ...formData,
      rate: parseFloat(formData.rate),
      taxSlab: parseFloat(formData.taxSlab)
    }

    try {
      if (editingItem) {
        await itemsAPI.update(editingItem._id, itemData)
        toast.success('Item updated successfully')
      } else {
        await itemsAPI.create(itemData)
        toast.success('Item added successfully')
      }
      fetchItems()
      handleCloseModal()
    } catch (error) {
      toast.error('Operation failed')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      hsnCode: item.hsnCode,
      rate: item.rate.toString(),
      taxSlab: item.taxSlab.toString(),
      units: item.units || 'per piece'
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (item) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemsAPI.delete(item._id)
        toast.success('Item deleted successfully')
        fetchItems()
      } catch (error) {
        toast.error('Failed to delete item')
      }
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setFormData({
      name: '',
      hsnCode: '',
      rate: '',
      taxSlab: '',
      units: 'per piece'
    })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Item Management</h1>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
              onClick={() => navigate('/assignments', {
                state: {
                  prefilledTask: 'Production Task Assignment',
                  assignmentType: 'production',
                  context: 'items_management'
                }
              })}
            >
              Assign Production
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              Add Item
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={items}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`${editingItem ? 'Edit' : 'Add'} Item`}
        >
          <form onSubmit={handleSubmit}>
            <InputField
              label="Item Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <InputField
              label="HSN Code"
              name="hsnCode"
              value={formData.hsnCode}
              onChange={handleChange}
              required
            />
            <InputField
              label="Rate (₹)"
              type="number"
              name="rate"
              value={formData.rate}
              onChange={handleChange}
              required
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Units <span className="text-red-500">*</span>
              </label>
              <select
                name="units"
                value={formData.units}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Slab <span className="text-red-500">*</span>
              </label>
              <select
                name="taxSlab"
                value={formData.taxSlab}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Tax Slab</option>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingItem ? 'Update' : 'Add'} Item
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

export default Items