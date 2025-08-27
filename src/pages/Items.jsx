import React, { useState, useEffect, useMemo } from 'react'
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
      rateInputType: 'Exclusive',
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
    rateInputType: 'Exclusive', // whether entered rate is Exclusive or Inclusive
    taxSlab: '',
    units: 'per piece'
  })

  const columns = [
    { key: 'name', label: 'Item Name' },
    { key: 'hsnCode', label: 'HSN Code' },
    { key: 'formattedRate', label: 'Rate' },
    { key: 'units', label: 'Units' },
    {
      key: 'taxSlabDisplay',
      label: 'Tax Slab',
      render: (value, item) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${Number(item.taxSlab || 0) === 0 ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
          {value}
        </span>
      )
    },
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
            stock <= lowStockThreshold ? 'text-orange-600' :
            'text-green-600'
          }`}>
            {stock}
            {stock <= 0 && (
              <span className="ml-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Out of Stock</span>
            )}
            {stock > 0 && stock <= lowStockThreshold && (
              <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Low Stock</span>
            )}
          </div>
        );
      }
    },
    { key: 'actions', label: 'Actions' }
  ]

  // Advanced filters like Zoho
  const [filters, setFilters] = useState({
    query: '',
    tax: 'ALL',
    stock: 'ALL', // ALL | IN | LOW | OUT
    units: 'ALL',
  })
  const [lowStockThreshold, setLowStockThreshold] = useState(10)

  const unitOptions = useMemo(() => {
    const s = new Set(items.filter(Boolean).map(i => i.units).filter(Boolean))
    return ['ALL', ...Array.from(s)]
  }, [items])

  const stats = useMemo(() => {
    const total = items.filter(Boolean).length
    const out = items.filter(i => (i?.stock ?? 0) <= 0).length
    const low = items.filter(i => (i?.stock ?? 0) > 0 && (i?.stock ?? 0) <= lowStockThreshold).length
    const inStock = Math.max(0, total - out)
    return { total, inStock, low, out }
  }, [items, lowStockThreshold])

  const filteredItems = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    return items.filter((it) => {
      if (!it) return false
  // Price Type filtering removed because all items are stored as canonical Exclusive
      if (filters.tax !== 'ALL' && String(it.taxSlab || 0) !== filters.tax) return false
      if (filters.units !== 'ALL' && (it.units || '') !== filters.units) return false
      const stock = Number(it.stock ?? 0)
      if (filters.stock === 'OUT' && !(stock <= 0)) return false
      if (filters.stock === 'LOW' && !(stock > 0 && stock <= lowStockThreshold)) return false
      if (filters.stock === 'IN' && !(stock > 0)) return false
      if (!q) return true
      const fields = [it.name, it.hsnCode, it.units, it.priceType, String(it.rate), String(it.taxSlab)]
        .map(x => (x ?? '').toString().toLowerCase())
      return fields.some(f => f.includes(q))
    })
  }, [items, filters, lowStockThreshold])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const response = await itemsAPI.getAll()
      // Normalize to array regardless of shape
      const itemsArr = Array.isArray(response)
        ? response
        : (Array.isArray(response?.data) ? response.data : [])
      
      const formattedItems = itemsArr
        .filter(item => item != null)
        .map(item => ({
          ...item,
          formattedRate: formatCurrency(item.rate || 0),
          taxSlabDisplay: `${item.taxSlab || 0}%`,
          stock: item.quantityInStock ?? 0
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

  // Export CSV of current view
  const exportCsv = () => {
    const headers = ['name','hsnCode','rate','taxSlab','units','stock']
    const rows = filteredItems.map(i => [
      i.name,
      i.hsnCode,
      i.rate,
      i.taxSlab || 0,
      i.units || '',
      i.stock ?? 0
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'items_export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Send raw entered rate to backend and include rateInputType so server normalizes once
    const itemData = {
      ...formData,
      rate: parseFloat(formData.rate) || 0,
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
  rateInputType: 'Exclusive',
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
          // Send raw rates to backend; server will normalize based on rateInputType/priceType
          const itemData = {
            ...item,
            rate: parseFloat(item.rate) || 0,
            taxSlab: item.taxSlab !== undefined && item.taxSlab !== '' ? parseFloat(item.taxSlab) : 0,
            quantityInStock: parseInt(item.stock) || 0,
            // Preserve any rateInputType supplied so server knows how to normalize
            rateInputType: item.rateInputType || item.priceType || 'Exclusive',
            priceType: item.priceType || 'Exclusive'
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
        rateInputType: 'Exclusive',
        taxSlab: '',
        units: 'per piece',
        stock: 0
      }])
    } catch (error) {
      console.error('Error in bulk submit:', error)
      toast.error('Failed to add items')
    }
  }

  // Enhanced CSV import functions - Complete rewrite
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    
    if (!file) {
      toast.error('Please select a file')
      return
    }

    // Accept both .csv files and .txt files with CSV content
    const isValidFile = file.type === 'text/csv' || 
                       file.name.toLowerCase().endsWith('.csv') ||
                       file.type === 'text/plain'
    
    if (!isValidFile) {
      toast.error('Please select a valid CSV file (.csv or .txt)')
      return
    }

    setCsvFile(file)
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target.result
        
        if (!csvContent || csvContent.trim() === '') {
          toast.error('CSV file is empty')
          return
        }

        // Better CSV parsing - handle quotes and commas within quotes
        const parseCSVLine = (line) => {
          const result = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          
          result.push(current.trim())
          return result.map(field => field.replace(/^"(.*)"$/, '$1')) // Remove surrounding quotes
        }

        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        
        if (lines.length < 2) {
          toast.error('CSV must have at least a header row and one data row')
          return
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
        console.log('CSV Headers found:', headers)
        
        // Flexible header mapping - support variations
        const headerMapping = {
          'name': ['name', 'item name', 'itemname', 'product name', 'product'],
          'hsnCode': ['hsn', 'hsncode', 'hsn code', 'hsn_code', 'hs code'],
          'rate': ['rate', 'price', 'selling price', 'sellingprice', 'amount', 'cost'],
          'taxSlab': ['tax', 'taxslab', 'tax slab', 'tax_slab', 'gst', 'tax rate', 'taxrate'],
          'units': ['unit', 'units', 'uom', 'measurement', 'per'],
          'stock': ['stock', 'quantity', 'qty', 'inventory', 'available']
        }

        // Find column indices
        const columnIndices = {}
        Object.keys(headerMapping).forEach(field => {
          const variations = headerMapping[field]
          const index = headers.findIndex(header => 
            variations.some(variation => header.includes(variation))
          )
          if (index !== -1) {
            columnIndices[field] = index
          }
        })

        console.log('Column mapping:', columnIndices)

        // Validate required columns
        const requiredFields = ['name', 'hsnCode', 'rate', 'taxSlab']
        const missingFields = requiredFields.filter(field => columnIndices[field] === undefined)
        
        if (missingFields.length > 0) {
          toast.error(`Missing required columns: ${missingFields.join(', ')}. Available columns: ${headers.join(', ')}`)
          return
        }

        const data = []
        const errors = []
        
        // Process data rows
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i])
            
            if (values.length === 0 || values.every(v => !v)) {
              continue // Skip empty rows
            }

            const item = {
              name: values[columnIndices.name]?.trim() || '',
              hsnCode: values[columnIndices.hsnCode]?.trim() || '',
              rate: values[columnIndices.rate]?.trim() || '',
              taxSlab: values[columnIndices.taxSlab]?.trim() || '',
              units: values[columnIndices.units]?.trim() || 'per piece',
              stock: values[columnIndices.stock]?.trim() || '0'
            }

            // Validation
            if (!item.name) {
              errors.push(`Row ${i + 1}: Missing item name`)
              continue
            }
            
            if (!item.hsnCode || item.hsnCode.length < 4) {
              errors.push(`Row ${i + 1}: Invalid HSN code (${item.hsnCode})`)
              continue
            }

            // Parse numeric values
            const rate = parseFloat(item.rate)
            const taxSlab = parseFloat(item.taxSlab)
            const stock = parseFloat(item.stock)

            if (isNaN(rate) || rate < 0) {
              errors.push(`Row ${i + 1}: Invalid rate (${item.rate})`)
              continue
            }

            if (isNaN(taxSlab) || taxSlab < 0 || taxSlab > 100) {
              errors.push(`Row ${i + 1}: Invalid tax slab (${item.taxSlab})`)
              continue
            }

            // Create processed item
            const processedItem = {
              name: item.name,
              hsnCode: item.hsnCode,
              rate: rate,
              priceType: 'Exclusive', // Default to Exclusive
              taxSlab: taxSlab,
              units: item.units,
              stock: isNaN(stock) ? 0 : Math.max(0, stock)
            }

            data.push(processedItem)
            
          } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`)
          }
        }

        if (errors.length > 0 && errors.length >= data.length) {
          console.error('CSV parsing errors:', errors)
          toast.error(`Failed to parse CSV. Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`)
          return
        }

        setCsvData(data)
        setCsvPreview(data.slice(0, 10)) // Show first 10 rows for preview
        
        let message = `${data.length} items loaded from CSV`
        if (errors.length > 0) {
          message += ` (${errors.length} rows had errors)`
          console.warn('CSV parsing errors:', errors)
        }
        
        toast.success(message)
        
      } catch (error) {
        console.error('CSV processing error:', error)
        toast.error(`Failed to process CSV: ${error.message}`)
      }
    }
    
    reader.onerror = () => {
      toast.error('Failed to read the file')
    }
    
    reader.readAsText(file)
  }

  // Enhanced CSV template download
  const downloadCsvTemplate = () => {
    const headers = 'name,hsnCode,rate,taxSlab,units,stock'
    const samples = [
      'Sample Carpet,57011000,1000,18,per piece,10',
      'Premium Rug,57023100,2500,18,per piece,5', 
      'Cotton Mat,57024100,500,12,per piece,20',
      'Exempted Item,99999999,100,0,per piece,0'
    ]
    const csvContent = [headers, ...samples].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `items_template_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('CSV template downloaded')
  }

  // Enhanced CSV import with better error handling
  const handleCsvImport = async () => {
    if (!csvData || csvData.length === 0) {
      toast.error('No data to import')
      return
    }

    setLoading(true)
    let successCount = 0
    let duplicateCount = 0
    let errorCount = 0
    const errors = []

    try {
      // Fetch existing items for duplicate checking
      const existingResponse = await itemsAPI.getAll()
      const existingItems = Array.isArray(existingResponse) 
        ? existingResponse 
        : (Array.isArray(existingResponse?.data) ? existingResponse.data : [])
      
      // Create lookup maps for faster duplicate detection
      const existingNames = new Set()
      const existingHsns = new Set()
      
      existingItems.forEach(item => {
        if (item?.name) existingNames.add(item.name.toLowerCase().trim())
        if (item?.hsnCode) existingHsns.add(item.hsnCode.trim())
      })

      console.log(`Starting CSV import of ${csvData.length} items...`)
      console.log(`Existing items: ${existingItems.length} (Names: ${existingNames.size}, HSNs: ${existingHsns.size})`)

      // Process items in batches to avoid overwhelming the server
      const batchSize = 10
      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (item, batchIndex) => {
          const rowNumber = i + batchIndex + 1
          
          try {
            // Final validation before API call
            if (!item.name || !item.hsnCode) {
              errors.push(`Row ${rowNumber}: Missing required fields`)
              errorCount++
              return
            }

            // Check for duplicates
            const nameKey = item.name.toLowerCase().trim()
            const hsnKey = item.hsnCode.trim()
            
            if (existingNames.has(nameKey)) {
              errors.push(`Row ${rowNumber}: Item "${item.name}" already exists`)
              duplicateCount++
              return
            }
            
            if (existingHsns.has(hsnKey)) {
              errors.push(`Row ${rowNumber}: HSN code "${item.hsnCode}" already exists`)
              duplicateCount++
              return
            }

            // Prepare item data for API
            const itemData = {
              name: item.name.trim(),
              hsnCode: item.hsnCode.trim(),
              rate: Number(item.rate),
              priceType: 'Exclusive', // Always store as Exclusive
              taxSlab: Number(item.taxSlab),
              units: item.units?.trim() || 'per piece',
              quantityInStock: Number(item.stock) || 0
            }

            console.log(`Importing item ${rowNumber}:`, itemData)

            // Create item via API
            const createdItem = await itemsAPI.create(itemData)
            
            if (createdItem) {
              successCount++
              // Add to lookup sets to prevent duplicates within same import
              existingNames.add(nameKey)
              existingHsns.add(hsnKey)
              
              console.log(`✅ Item ${rowNumber} created:`, createdItem._id || createdItem.id)
            } else {
              errors.push(`Row ${rowNumber}: API returned no data`)
              errorCount++
            }
            
          } catch (apiError) {
            console.error(`❌ Item ${rowNumber} failed:`, apiError)
            
            if (apiError.message?.includes('duplicate') || 
                apiError.message?.includes('exists') ||
                apiError.status === 400) {
              duplicateCount++
              errors.push(`Row ${rowNumber}: ${item.name} - Already exists`)
            } else {
              errorCount++
              errors.push(`Row ${rowNumber}: ${item.name} - ${apiError.message || 'Unknown error'}`)
            }
          }
        }))

        // Small delay between batches to prevent rate limiting
        if (i + batchSize < csvData.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`✅ Successfully imported ${successCount} items`)
      }
      
      if (duplicateCount > 0) {
        toast(`⚠️ Skipped ${duplicateCount} duplicate items`, { 
          icon: '⚠️',
          style: { background: '#fef3c7', color: '#92400e' },
          duration: 4000
        })
      }
      
      if (errorCount > 0) {
        toast.error(`❌ ${errorCount} items failed to import`)
        console.error('Import errors:', errors.filter(e => !e.includes('Already exists')))
      }

      // Refresh items list
      await fetchItems()
      
      // Close modal and reset
      setIsCsvModalOpen(false)
      setCsvFile(null)
      setCsvData([])
      setCsvPreview([])
      
    } catch (error) {
      console.error('CSV import failed:', error)
      toast.error(`CSV import failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test function to verify delete API (for debugging)
  const testDeleteAPI = async () => {
    try {
      console.log('Testing delete API...')
      const response = await itemsAPI.getAll()
      const allItems = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : [])
      
      if (allItems.length === 0) {
        console.log('No items to test delete with')
        return
      }
      
      // Find a test item (look for one we created for testing)
      const testItem = allItems.find(item => item.name.toLowerCase().includes('test') || item.name.toLowerCase().includes('sample'))
      
      if (!testItem) {
        console.log('No test item found to delete')
        return
      }
      
      console.log('Found test item to delete:', testItem)
      
      const confirmed = window.confirm(`Test delete API with item: "${testItem.name}"?`)
      if (!confirmed) return
      
      const deleteResult = await itemsAPI.delete(testItem._id)
      console.log('Delete test result:', deleteResult)
      toast.success(`Test delete successful: ${testItem.name}`)
      
      await fetchItems()
      
    } catch (error) {
      console.error('Delete test failed:', error)
      toast.error('Delete test failed - check console')
    }
  }

  // Function to find and delete duplicate items
  const findAndDeleteDuplicates = async () => {
    try {
      const response = await itemsAPI.getAll()
      console.log('API Response:', response)
      
      const allItems = Array.isArray(response) ? response : 
                      (Array.isArray(response?.data) ? response.data : [])
      
      console.log('All items:', allItems.length, allItems)
      
      if (allItems.length === 0) {
        toast.success('No items found in database')
        return
      }
      
      // Group items by name (case-insensitive) and HSN code
      const itemGroups = {}
      const duplicates = []
      
      allItems.forEach(item => {
        if (item && item.name && item.hsnCode) {
          const key = `${item.name.toLowerCase()}_${item.hsnCode}`
          if (!itemGroups[key]) {
            itemGroups[key] = []
          }
          itemGroups[key].push(item)
        }
      })
      
      console.log('Item groups:', itemGroups)
      
      // Find duplicates (groups with more than 1 item)
      Object.entries(itemGroups).forEach(([key, group]) => {
        if (group.length > 1) {
          console.log(`Found duplicates for key "${key}":`, group.map(item => ({ id: item._id, name: item.name })))
          // Keep the first item, mark others as duplicates
          duplicates.push(...group.slice(1))
        }
      })
      
      console.log('Total duplicates found:', duplicates.length)
      
      // For carpet business, HSN codes can be legitimately shared
      // Focus on exact duplicates (same name + same HSN)
      const exactDuplicates = duplicates
      
      // Also check for name-only duplicates (these are likely real duplicates)
      const nameGroups = {}
      allItems.forEach(item => {
        if (item && item.name) {
          const nameKey = item.name.toLowerCase()
          if (!nameGroups[nameKey]) {
            nameGroups[nameKey] = []
          }
          nameGroups[nameKey].push(item)
        }
      })
      
      const nameDuplicates = []
      Object.entries(nameGroups).forEach(([name, group]) => {
        if (group.length > 1) {
          console.log(`Found name duplicates for "${name}":`, group.map(item => ({ id: item._id, hsnCode: item.hsnCode })))
          nameDuplicates.push(...group.slice(1))
        }
      })
      
      // Combine exact duplicates and name duplicates (ignore HSN-only duplicates as they're normal)
      const allDuplicates = [...exactDuplicates, ...nameDuplicates]
      const uniqueDuplicates = allDuplicates.filter((item, index, self) => 
        index === self.findIndex(t => t._id === item._id)
      )
      
      console.log('Total unique duplicates found (excluding normal HSN sharing):', uniqueDuplicates.length)
      
      if (uniqueDuplicates.length === 0) {
        toast.success('No duplicate items found')
        return
      }
      
      console.log('About to show confirmation dialog for', uniqueDuplicates.length, 'duplicates')
      
      // Show simple confirmation first
      const simpleConfirm = window.confirm(
        `Found ${uniqueDuplicates.length} duplicate items that can be deleted.\n\nDo you want to see the list and confirm deletion?`
      )
      
      if (!simpleConfirm) {
        console.log('User canceled at initial confirmation')
        return
      }
      
      // Show detailed list in a second confirmation
      const duplicatesList = uniqueDuplicates.slice(0, 10).map(item => `• ${item.name}`).join('\n')
      const detailedMessage = `These ${uniqueDuplicates.length} duplicate items will be deleted:\n\n${duplicatesList}${uniqueDuplicates.length > 10 ? '\n...and ' + (uniqueDuplicates.length - 10) + ' more' : ''}\n\nConfirm deletion?`
      
      const finalConfirm = window.confirm(detailedMessage)
      console.log('User final confirmation result:', finalConfirm)
      
      if (!finalConfirm) {
        console.log('User canceled at detailed confirmation')
        return
      }
      
      // Delete duplicates
      console.log('Starting deletion process for', uniqueDuplicates.length, 'items')
      let deletedCount = 0
      let failedCount = 0
      
      for (let i = 0; i < uniqueDuplicates.length; i++) {
        const duplicate = uniqueDuplicates[i]
        try {
          console.log(`[${i+1}/${uniqueDuplicates.length}] Deleting item: ${duplicate.name} (ID: ${duplicate._id})`)
          
          const deleteResponse = await itemsAPI.delete(duplicate._id)
          console.log(`Delete API response:`, deleteResponse)
          
          deletedCount++
          console.log(`✅ Successfully deleted: ${duplicate.name}`)
        } catch (error) {
          failedCount++
          console.error(`❌ Error deleting duplicate "${duplicate.name}":`, error)
          console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          })
        }
      }
      
      console.log(`🎯 Deletion complete. Deleted: ${deletedCount}, Failed: ${failedCount}`)
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} duplicate items deleted${failedCount > 0 ? `, ${failedCount} failed` : ''}`)
        console.log('Refreshing items list...')
        await fetchItems() // Refresh the list
        console.log('Items list refreshed')
      } else {
        toast.error('No items could be deleted. Check console for errors.')
      }
      
    } catch (error) {
      console.error('Error finding duplicates:', error)
      toast.error('Failed to find duplicates')
    }
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs text-gray-500">Total Items</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs text-gray-500">In Stock</div>
            <div className="text-2xl font-semibold text-green-600">{stats.inStock}</div>
          </div>
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs text-gray-500">Low Stock ≤ {lowStockThreshold}</div>
            <div className="text-2xl font-semibold text-orange-600">{stats.low}</div>
          </div>
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-xs text-gray-500">Out of Stock</div>
            <div className="text-2xl font-semibold text-red-600">{stats.out}</div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Item Management</h1>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setIsModalOpen(true)}>Add Item</Button>
            <Button onClick={() => setIsBulkModalOpen(true)} variant="secondary">Bulk Add Items</Button>
            <Button onClick={() => setIsCsvModalOpen(true)} variant="secondary">Import CSV</Button>
            <Button onClick={exportCsv} variant="outline">Export CSV</Button>
            <Button onClick={findAndDeleteDuplicates} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">Clean Duplicates</Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white rounded-lg border p-3 md:p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Search</label>
              <input
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Search by name, HSN, rate, tax..."
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            {/* Price Type filter removed - rates are stored canonical Exclusive */}
            <div>
              <label className="text-xs text-gray-600">Tax Slab</label>
              <select
                value={filters.tax}
                onChange={(e) => setFilters(prev => ({ ...prev, tax: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="ALL">All</option>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Units</label>
              <select
                value={filters.units}
                onChange={(e) => setFilters(prev => ({ ...prev, units: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {unitOptions.map(u => (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Stock Status</label>
              <select
                value={filters.stock}
                onChange={(e) => setFilters(prev => ({ ...prev, stock: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="ALL">All</option>
                <option value="IN">In Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="OUT">Out of Stock</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Low Stock Threshold</label>
              <input
                type="number"
                min={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={filteredItems}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortable={true}
              pagination={true}
              pageSize={10}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate Input Type</label>
              <select
                name="rateInputType"
                value={formData.rateInputType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Exclusive">Entering exclusive rate</option>
                <option value="Inclusive">Entering inclusive (tax included) rate</option>
              </select>
            </div>
            {/* Price Type input removed - storing canonical Exclusive rates only. */}
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
                    {/* Price Type removed from bulk entry - rates will be normalized to Exclusive */}
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
                Your CSV file must have these columns: name, hsnCode, rate, taxSlab, units<br/>
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
                        {/* Price Type column removed from CSV preview - rates will be normalized to Exclusive */}
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
                          {/* Price Type removed from preview */}
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