import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import Table from '../components/Table'
import Button from '../components/Button'
import InputField from '../components/InputField' // Import InputField
import { customersAPI } from '../api/customers'
import AddCustomerModal from '../components/AddCustomerModal'
import { billingAPI } from '../api/billing'

const Customers = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('ALL')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState('') // New state for search term
  const [filters, setFilters] = useState({ state: 'ALL' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerCustomer, setDrawerCustomer] = useState(null)
  const [drawerInvoices, setDrawerInvoices] = useState([])
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Derived stats and options
  const stats = useMemo(() => {
    const total = customers.length
    const b2b = customers.filter(c => c?.customerType === 'B2B').length
    const b2c = customers.filter(c => c?.customerType === 'B2C').length
    return { total, b2b, b2c }
  }, [customers])

  const stateOptions = useMemo(() => {
    const set = new Set(customers.map(c => c?.state).filter(Boolean))
    return ['ALL', ...Array.from(set)]
  }, [customers])

  const b2bColumns = [
    { key: 'firmName', label: 'Firm Name' },
    { key: 'gstNo', label: 'GST No.' },
    { key: 'firmAddress', label: 'Registered Address' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'panNo', label: 'PAN No.' },
    { key: 'billingAddress', label: 'Billing Address' },
    { key: 'notes', label: 'Notes' },
  ]

  const b2cColumns = [
    { key: 'name', label: 'Name' },
    { key: 'contact', label: 'Contact' },
    { key: 'email', label: 'Email' },
    { key: 'billingAddress', label: 'Billing Address' },
    { key: 'notes', label: 'Notes' },
  ]

  // Columns with quick View
  const viewColumn = { key: 'view', label: '', render: (_v, row) => (
    <button onClick={() => openDrawer(row)} className="text-blue-600 hover:underline text-sm">View</button>
  ) }

  // Unified columns for ALL view (enhanced)
  const allColumns = [viewColumn,
    { key: 'displayName', label: 'Name', render: (_v, row) => row.firmName || row.name || '' },
    { key: 'customerType', label: 'Type' },
    { key: 'gstNo', label: 'GST No.' },
    { key: 'contact', label: 'Contact', render: (_v, row) => row.contact || row.phone || '' },
    { key: 'email', label: 'Email' },
    { key: 'state', label: 'State' },
    { key: 'address', label: 'Address', render: (_v, row) => row.billingAddress || row.firmAddress || '' },
    { key: 'notes', label: 'Notes' },
  ]

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const typeParam = activeTab === 'ALL' ? undefined : activeTab
      const response = await customersAPI.getAll(typeParam)
      // Defensive: always set to array
      if (Array.isArray(response?.data)) {
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

  const openDrawer = (customer) => {
    setDrawerCustomer(customer)
    setDrawerOpen(true)
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setDrawerCustomer(null)
    setDrawerInvoices([])
  }

  // Fetch customer invoices for the drawer
  useEffect(() => {
    const fetchCustomerInvoices = async () => {
      if (!drawerOpen || !drawerCustomer?._id) return
      try {
        setDrawerLoading(true)
        const all = await billingAPI.getInvoices() // returns populated customer
        const filtered = Array.isArray(all) ? all.filter(inv => (inv.customer?._id || inv.customer) === drawerCustomer._id) : []
        setDrawerInvoices(filtered)
      } catch (e) {
        console.error('Failed to load customer invoices', e)
      } finally {
        setDrawerLoading(false)
      }
    }
    fetchCustomerInvoices()
  }, [drawerOpen, drawerCustomer])

  // Quick stats for drawer
  const drawerStats = useMemo(() => {
    const count = drawerInvoices.length
    const totalSales = drawerInvoices.reduce((s, i) => s + (Number(i.grandTotal ?? i.totalAmount ?? 0) || 0), 0)
    const outstanding = drawerInvoices.reduce((s, i) => {
      const paid = Number(i.paidAmount || 0)
      const total = Number(i.grandTotal ?? i.totalAmount ?? 0)
      const balance = Number(i.balance ?? (total - paid))
      return s + Math.max(0, balance)
    }, 0)
    return { count, totalSales, outstanding }
  }, [drawerInvoices])

  // Filter customers based on active tab, advanced filters and search term
  const filteredCustomers = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim()
    return customers.filter(c => {
      if (!c) return false
      const matchesTab = activeTab === 'ALL' || (c.customerType === activeTab)
      if (!matchesTab) return false
      if (filters.state !== 'ALL' && c.state !== filters.state) return false

      if (!q) return true
      const haystacks = [
        (c.firmName || ''), (c.name || ''), (c.gstNo || ''), (c.state || ''),
        (c.firmAddress || ''), (c.billingAddress || ''), (c.contact || c.phone || ''), (c.email || ''), (c.panNo || ''), (c.notes || ''),
      ].map(s => s.toLowerCase())
      return haystacks.some(h => h.includes(q))
    })
  }, [customers, activeTab, filters, searchTerm])

  // Export CSV of filtered view
  const exportCsv = () => {
    const headers = ['customerType','firmName','name','gstNo','contact','email','state','address','notes']
    const rows = filteredCustomers.map(c => [
      c.customerType || '', c.firmName || '', c.name || '', c.gstNo || '', c.contact || c.phone || '', c.email || '', c.state || '', (c.billingAddress || c.firmAddress || ''), c.notes || ''
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'customers_export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // Drawer actions
  const createInvoiceForCustomer = () => {
    if (!drawerCustomer?._id) return
    // Navigate to billing; EnhancedBillingForm will need to read prefill from sessionStorage or query
    sessionStorage.setItem('prefillCustomerId', drawerCustomer._id)
    navigate('/billing')
  }
  const recordPaymentForCustomer = async () => {
    try {
      if (!drawerCustomer?._id) return;
      const input = window.prompt('Enter payment amount (₹):');
      if (!input) return;
      const amount = Number(input);
      if (!amount || amount <= 0) return toast.error('Enter a valid amount');
      const method = window.prompt('Payment method (e.g., Cash/UPI/Card/Bank):', 'Cash') || 'Cash';
      const notes = window.prompt('Notes (optional):', '') || '';
      const res = await billingAPI.recordCustomerPayment(drawerCustomer._id, { amount, method, notes });
      toast.success(`Payment recorded: ₹${amount.toFixed(2)}`);
      // Refresh invoices and stats
      const all = await billingAPI.getInvoices();
      const filtered = Array.isArray(all) ? all.filter(inv => (inv.customer?._id || inv.customer) === drawerCustomer._id) : [];
      setDrawerInvoices(filtered);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to record payment');
    }
  }
  const emailStatementToCustomer = async () => {
    try {
      if (!drawerCustomer?._id) return;
      const start = window.prompt('Statement start date (YYYY-MM-DD) or leave blank:', '');
      const end = window.prompt('Statement end date (YYYY-MM-DD) or leave blank:', '');
      const payload = {};
      if (start) payload.startDate = start;
      if (end) payload.endDate = end;
      const res = await billingAPI.emailCustomerStatement(drawerCustomer._id, payload);
      toast.success('Statement prepared');
      // Show a preview in a new window for now
      const w = window.open('', '_blank');
      if (w && res?.html) {
        w.document.write(res.html);
        w.document.close();
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to prepare statement');
    }
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Summary Cards (removed With/Without GST) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg border bg-white"><div className="text-xs text-gray-500">Total</div><div className="text-2xl font-semibold">{stats.total}</div></div>
          <div className="p-4 rounded-lg border bg-white"><div className="text-xs text-gray-500">B2B</div><div className="text-2xl font-semibold text-blue-600">{stats.b2b}</div></div>
          <div className="p-4 rounded-lg border bg-white"><div className="text-xs text-gray-500">B2C</div><div className="text-2xl font-semibold text-green-600">{stats.b2c}</div></div>
        </div>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setIsModalOpen(true)}>Add Customer</Button>
            <Button onClick={exportCsv} variant="outline">Export CSV</Button>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex flex-col gap-3 border-b border-gray-200 pb-4">
          <div className="flex justify-between items-center">
            <nav className="-mb-px flex space-x-8">
              {['ALL', 'B2B', 'B2C'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab === 'ALL' ? 'All Customers' : `${tab} Customers`}
                </button>
              ))}
            </nav>
            <div className="w-full sm:w-64">
              <InputField
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600">State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {stateOptions.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table
              columns={activeTab === 'ALL' ? allColumns : (activeTab === 'B2B' ? [viewColumn, ...b2bColumns] : [viewColumn, ...b2cColumns])}
              data={filteredCustomers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortable={true}
              pagination={true}
              pageSize={10}
            />
          )}
        </div>

        {/* Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
            <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl border-l">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Customer Details</div>
                  <div className="text-sm text-gray-600">{drawerCustomer?.firmName || drawerCustomer?.name}</div>
                </div>
                <button className="px-2 py-1" onClick={closeDrawer}>✕</button>
              </div>

              <div className="p-4 space-y-6 overflow-auto h-[calc(100%-56px)]">
                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={createInvoiceForCustomer}>
                    Create Invoice
                  </Button>
                  <Button variant="secondary" onClick={recordPaymentForCustomer}>
                    Record Payment
                  </Button>
                  <Button variant="outline" onClick={emailStatementToCustomer}>
                    Email Statement
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded border"><div className="text-xs text-gray-500">Invoices</div><div className="text-xl font-semibold">{drawerStats.count}</div></div>
                  <div className="p-3 rounded border"><div className="text-xs text-gray-500">Outstanding</div><div className="text-xl font-semibold text-red-600">₹{drawerStats.outstanding.toFixed(2)}</div></div>
                  <div className="p-3 rounded border col-span-2"><div className="text-xs text-gray-500">Total Sales</div><div className="text-xl font-semibold text-green-600">₹{drawerStats.totalSales.toFixed(2)}</div></div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Contact</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>{drawerCustomer?.contact || drawerCustomer?.phone} {drawerCustomer?.email ? <span className="text-gray-400">•</span> : null} {drawerCustomer?.email}</div>
                    <div>GSTIN: {drawerCustomer?.gstNo || '—'}</div>
                    <div>State: {drawerCustomer?.state || '—'}</div>
                    <div>Address: {drawerCustomer?.billingAddress || drawerCustomer?.firmAddress || '—'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Recent Invoices</div>
                  {drawerLoading ? (
                    <div className="text-sm text-gray-500">Loading invoices…</div>
                  ) : drawerInvoices.length === 0 ? (
                    <div className="text-sm text-gray-500">No invoices found.</div>
                  ) : (
                    <div className="space-y-2">
                      {drawerInvoices.slice(0, 6).map((inv) => (
                        <div key={inv._id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm">{inv.invoiceNumber || inv._id?.slice(-6)}</div>
                            <div className="text-xs text-gray-600">₹{Number(inv.grandTotal ?? inv.totalAmount ?? 0).toFixed(2)} • Balance ₹{Number(inv.balance ?? ((inv.grandTotal ?? inv.totalAmount ?? 0) - (inv.paidAmount || 0))).toFixed(2)}</div>
                          </div>
                          <a href={`/edit-invoice/${inv._id}`} className="text-blue-600 text-xs hover:underline">Open</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        <AddCustomerModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onCustomerAdded={handleCustomerAdded}
          customerType={activeTab === 'ALL' ? 'B2C' : activeTab}
          editingCustomer={editingCustomer}
        />
      </div>
    </Layout>
  )
}

export default Customers


