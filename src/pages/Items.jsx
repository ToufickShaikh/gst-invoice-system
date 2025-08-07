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
    { key: 'taxSlabDisplay', label: 'Tax Slab' },
    { 
      key: 'stockDisplay', 
      label: 'Stock',
      render: (item) => (
        <div className={`font-semibold ${
          item.stock <= 0 ? 'text-red-600' : 
          item.stock <= 10 ? 'text-orange-600' : 
          'text-green-600'
        }`}>
          {item.stock || 0}
          {item.stock <= 0 && (
            <span className="ml-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
              Out of Stock
            </span>
          )}
          {item.stock > 0 && item.stock <= 10 && (
            <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
              Low Stock
            </span>
          )}
        </div>
      )
    }
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
        taxSlabDisplay: `${item.taxSlab}%`,
        stock: item.stock ?? 0
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
    // If adding, allow initial stock entry
    if (!editingItem && formData.stock !== undefined) {
      itemData.stock = parseInt(formData.stock)
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
      units: item.units || 'per piece',
      stock: item.stock ?? 0
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
        {/* Stock Alerts */}
        {items.some(item => item.stock <= 10) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-yellow-800 font-medium">Stock Alerts</h3>
            </div>
            <div className="mt-2 text-sm text-yellow-700">
              {items.filter(item => item.stock <= 0).length > 0 && (
                <p>{items.filter(item => item.stock <= 0).length} items are out of stock</p>
              )}
              {items.filter(item => item.stock > 0 && item.stock <= 10).length > 0 && (
                <p>{items.filter(item => item.stock > 0 && item.stock <= 10).length} items have low stock</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Item Management</h1>
          <div className="flex gap-3">
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
            <InputField
              label="Stock"
              name="stock"
              type="number"
              value={formData.stock ?? ''}
              onChange={handleChange}
              min={0}
            />
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