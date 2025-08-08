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
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [csvPreview, setCsvPreview] = useState([])
  const [bulkItems, setBulkItems] = useState([
    {
      name: '',
      hsnCode: '',
      rate: '',
      priceType: 'Exclusive',
      taxSlab: '',
      units: 'per piece',
      stock: 0
    }
  ])
  const [formData, setFormData] = useState({
    name: '',
    hsnCode: '',
    rate: '',
    priceType: 'Exclusive',  // GST price type selection
    taxSlab: '',
    units: 'per piece'
  })

  const columns = [
    { key: 'name', label: 'Item Name' },
    { key: 'hsnCode', label: 'HSN Code' },
    { key: 'priceType', label: 'Price Type' },
    { key: 'formattedRate', label: 'Rate' },
    { key: 'units', label: 'Units' },
    { key: 'taxSlabDisplay', label: 'Tax Slab' },
    { 
      key: 'stockDisplay', 
      label: 'Stock',
      render: (value, item) => {
        // Defensive check to handle undefined items
        if (!item) return <span>-</span>;
        
        const stock = item.stock ?? 0;
        return (
          <div className={`font-semibold ${
            stock <= 0 ? 'text-red-600' : 
            stock <= 10 ? 'text-orange-600' : 
            'text-green-600'
          }`}>
            {stock}
            {stock <= 0 && (
              <span className="ml-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Out of Stock
              </span>
            )}
            {stock > 0 && stock <= 10 && (
              <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                Low Stock
              </span>
            )}
          </div>
        );
      }
    }
  ]

  const fetchItems = async () => {
    setLoading(true)
    try {
      const response = await itemsAPI.getAll()
      // Defensive: always use array and handle undefined items
      const itemsArr = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response) ? response : [])
      
      const formattedItems = itemsArr
        .filter(item => item != null) // Filter out null/undefined items
        .map(item => ({
          ...item,
          formattedRate: formatCurrency(item.rate || 0),
          taxSlabDisplay: `${item.taxSlab || 0}%`,
          stock: item.quantityInStock ?? 0  // Use quantityInStock from backend
        }))
      setItems(formattedItems)
    } catch (error) {
      console.error('Error fetching items:', error)
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
    // If adding, allow initial stock entry - use quantityInStock for backend
    if (!editingItem && formData.stock !== undefined) {
      itemData.quantityInStock = parseInt(formData.stock)
    }
    try {
      if (editingItem) {
        if (!editingItem._id) {
          toast.error('Invalid item data');
          return;
        }
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
    if (!item) {
      toast.error('Invalid item selected');
      return;
    }
    
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      hsnCode: item.hsnCode || '',
      rate: (item.rate || 0).toString(),
      taxSlab: (item.taxSlab || 0).toString(),
      units: item.units || 'per piece',
      stock: item.quantityInStock ?? 0  // Use quantityInStock from backend
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (item) => {
    if (!item || !item._id) {
      toast.error('Invalid item data');
      return;
    }
    
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
      priceType: 'Exclusive',
      taxSlab: '',
      units: 'per piece'
    })
  }

  // Bulk add functions
  const handleBulkChange = (index, field, value) => {
    const newBulkItems = [...bulkItems]
    newBulkItems[index][field] = value
    setBulkItems(newBulkItems)
  }

  const addBulkRow = () => {
    setBulkItems([
      ...bulkItems,
      {
        name: '',
        hsnCode: '',
        rate: '',
        priceType: 'Exclusive',
        taxSlab: '',
        units: 'per piece',
        stock: 0
      }
    ])
  }

  const removeBulkRow = (index) => {
    if (bulkItems.length > 1) {
      const newBulkItems = bulkItems.filter((_, i) => i !== index)
      setBulkItems(newBulkItems)
    }
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    try {
      const validItems = bulkItems.filter(item => 
        item.name.trim() && item.hsnCode.trim() && item.rate && (item.taxSlab !== undefined && item.taxSlab !== '')
      )
      
      if (validItems.length === 0) {
        toast.error('Please fill at least one complete item')
        return
      }

      let successCount = 0
      for (const item of validItems) {
        try {
          const itemData = {
            ...item,
            rate: parseFloat(item.rate),
            taxSlab: item.taxSlab !== undefined && item.taxSlab !== '' ? parseFloat(item.taxSlab) : 18,
            quantityInStock: parseInt(item.stock) || 0
          }
          await itemsAPI.create(itemData)
          successCount++
        } catch (error) {
          console.error('Error creating item:', item.name, error)
        }
      }

      toast.success(`${successCount} items added successfully`)
      if (successCount < validItems.length) {
        toast.error(`${validItems.length - successCount} items failed to add`)
      }
      
      fetchItems()
      setIsBulkModalOpen(false)
      setBulkItems([{
        name: '',
        hsnCode: '',
        rate: '',
        priceType: 'Exclusive',
        taxSlab: '',
        units: 'per piece',
        stock: 0
      }])
    } catch (error) {
      console.error('Error in bulk submit:', error)
      toast.error('Failed to add items')
    }
  }

  // CSV import functions
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        const csv = event.target.result
        const lines = csv.split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        
        // Expected headers: name,hsnCode,rate,priceType,taxSlab,units (stock will be set to 0)
        const expectedHeaders = ['name', 'hsnCode', 'rate', 'priceType', 'taxSlab', 'units']
        const isValidFormat = expectedHeaders.every(header => 
          headers.some(h => h.toLowerCase() === header.toLowerCase())
        )
        
        if (!isValidFormat) {
          toast.error('Invalid CSV format. Expected headers: name,hsnCode,rate,priceType,taxSlab,units')
          return
        }
        
        const data = []
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim())
            const item = {}
            
            // Create a header mapping for case-insensitive matching
            const headerMap = {
              'name': 'name',
              'hsncode': 'hsnCode',
              'rate': 'rate', 
              'pricetype': 'priceType',
              'taxslab': 'taxSlab',
              'units': 'units'
            }
            
            headers.forEach((header, index) => {
              const lowerHeader = header.toLowerCase()
              const mappedKey = headerMap[lowerHeader]
              if (mappedKey && values[index]) {
                item[mappedKey] = values[index].trim()
              }
            })
            
            if (item.name && item.hsnCode) {
              data.push(item)
            }
          }
        }
        
        setCsvData(data)
        setCsvPreview(data.slice(0, 5)) // Show first 5 rows for preview
        toast.success(`${data.length} items loaded from CSV`)
      }
      reader.readAsText(file)
    } else {
      toast.error('Please select a valid CSV file')
    }
  }

  const downloadCsvTemplate = () => {
    const headers = 'name,hsnCode,rate,priceType,taxSlab,units\n'
    const sample = 'Sample Carpet,12345678,1000,Exclusive,18,per piece\n'
    const csvContent = headers + sample
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'items_template.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleCsvImport = async () => {
    if (csvData.length === 0) {
      toast.error('No data to import')
      return
    }

    try {
      let successCount = 0
      const errors = []

      for (const item of csvData) {
        try {
          const itemData = {
            name: item.name,
            hsnCode: item.hsnCode,
            rate: parseFloat(item.rate) || 0,
            priceType: item.priceType || 'Exclusive',
            taxSlab: item.taxSlab !== undefined && item.taxSlab !== '' ? parseFloat(item.taxSlab) : 18,
            units: item.units || 'per piece',
            quantityInStock: 0  // Always start with 0 stock, to be managed through purchase system
          }
          
          // Validate required fields
          if (!itemData.name || !itemData.hsnCode || itemData.rate <= 0) {
            errors.push(`Skipped "${item.name || 'unnamed'}": Missing required fields`)
            continue
          }
          
          await itemsAPI.create(itemData)
          successCount++
        } catch (error) {
          errors.push(`Failed to add "${item.name}": ${error.message}`)
        }
      }

      toast.success(`${successCount} items imported successfully`)
      if (errors.length > 0) {
        console.error('Import errors:', errors)
        toast.error(`${errors.length} items failed to import`)
      }
      
      fetchItems()
      setIsCsvModalOpen(false)
      setCsvFile(null)
      setCsvData([])
      setCsvPreview([])
    } catch (error) {
      toast.error('CSV import failed')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stock Alerts */}
        {items.filter(item => item != null).some(item => (item.stock ?? 0) <= 10) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-yellow-800 font-medium">Stock Alerts</h3>
            </div>
            <div className="mt-2 text-sm text-yellow-700">
              {items.filter(item => item != null && (item.stock ?? 0) <= 0).length > 0 && (
                <p>{items.filter(item => item != null && (item.stock ?? 0) <= 0).length} items are out of stock</p>
              )}
              {items.filter(item => item != null && (item.stock ?? 0) > 0 && (item.stock ?? 0) <= 10).length > 0 && (
                <p>{items.filter(item => item != null && (item.stock ?? 0) > 0 && (item.stock ?? 0) <= 10).length} items have low stock</p>
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
            <Button onClick={() => setIsBulkModalOpen(true)} variant="secondary">
              Bulk Add Items
            </Button>
            <Button onClick={() => setIsCsvModalOpen(true)} variant="secondary">
              Import CSV
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
                Price Type <span className="text-red-500">*</span>
              </label>
              <select
                name="priceType"
                value={formData.priceType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Exclusive">Exclusive of GST</option>
                <option value="Inclusive">Inclusive of GST</option>
              </select>
            </div>
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

        {/* Bulk Add Modal */}
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Bulk Add Items"
          size="large"
        >
          <form onSubmit={handleBulkSubmit}>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {bulkItems.map((item, index) => (
                <div key={index} className="border p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {bulkItems.length > 1 && (
                      <Button 
                        type="button" 
                        variant="danger" 
                        size="sm"
                        onClick={() => removeBulkRow(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Item Name"
                      value={item.name}
                      onChange={(e) => handleBulkChange(index, 'name', e.target.value)}
                      required
                    />
                    <InputField
                      label="HSN Code"
                      value={item.hsnCode}
                      onChange={(e) => handleBulkChange(index, 'hsnCode', e.target.value)}
                      required
                    />
                    <InputField
                      label="Rate (₹)"
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleBulkChange(index, 'rate', e.target.value)}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price Type
                      </label>
                      <select
                        value={item.priceType}
                        onChange={(e) => handleBulkChange(index, 'priceType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Exclusive">Exclusive of GST</option>
                        <option value="Inclusive">Inclusive of GST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Units
                      </label>
                      <select
                        value={item.units}
                        onChange={(e) => handleBulkChange(index, 'units', e.target.value)}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Slab
                      </label>
                      <select
                        value={item.taxSlab}
                        onChange={(e) => handleBulkChange(index, 'taxSlab', e.target.value)}
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
                      label="Initial Stock"
                      type="number"
                      value={item.stock}
                      onChange={(e) => handleBulkChange(index, 'stock', e.target.value)}
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button type="button" onClick={addBulkRow} variant="secondary">
                + Add Another Item
              </Button>
              <div className="flex space-x-2">
                <Button type="button" variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Add All Items ({bulkItems.filter(item => 
                    item.name.trim() && item.hsnCode.trim() && item.rate && item.taxSlab
                  ).length})
                </Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* CSV Import Modal */}
        <Modal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          title="Import Items from CSV"
          size="large"
        >
          <div className="space-y-6">
            {/* CSV Template Download */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">CSV Format Required</h4>
              <p className="text-blue-800 text-sm mb-3">
                Your CSV file must have these columns: name, hsnCode, rate, priceType, taxSlab, units<br/>
                <span className="text-xs">Note: Stock will be set to 0 for all imported items. Use Purchase system to manage stock.</span>
              </p>
              <Button 
                type="button" 
                onClick={downloadCsvTemplate}
                variant="secondary"
                size="sm"
              >
                Download Template CSV
              </Button>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Preview (First 5 items)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-1 text-left text-xs">Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left text-xs">HSN</th>
                        <th className="border border-gray-300 px-2 py-1 text-left text-xs">Rate</th>
                        <th className="border border-gray-300 px-2 py-1 text-left text-xs">Price Type</th>
                        <th className="border border-gray-300 px-2 py-1 text-left text-xs">Tax</th>
                        <th className="border border-gray-300 px-2 py-1 text-left text-xs">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{item.name}</td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{item.hsnCode}</td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{item.rate}</td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{item.priceType || 'Exclusive'}</td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{item.taxSlab}%</td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{item.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Total items to import: {csvData.length}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setIsCsvModalOpen(false)}
              >
                Cancel
              </Button>
              {csvData.length > 0 && (
                <Button 
                  type="button" 
                  variant="primary"
                  onClick={handleCsvImport}
                >
                  Import {csvData.length} Items
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}

export default Items