import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Layout from './Layout';
import Table from './Table';
import Button from './Button';
import Modal from './Modal';
import InputField from './InputField';
import { salesOrdersAPI } from '../api/salesOrders';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { useCompany } from '../context/CompanyContext.jsx';
import { formatCurrency } from '../utils/dateHelpers';

const EnhancedSalesOrderManagement = () => {
  const { company } = useCompany();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', dateFrom: '', dateTo: '', search: '', customer: '' });
  const [selected, setSelected] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customer: '', orderDate: '', status: 'Pending', notes: '', items: [] });

  useEffect(() => {
    fetchAll();
  }, [filters]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ordersRes, customersRes, itemsRes] = await Promise.all([
        salesOrdersAPI.getAll(),
        customersAPI.getAll(),
        itemsAPI.getAll(),
      ]);
      const ordersData = Array.isArray(ordersRes?.data) ? ordersRes.data : (Array.isArray(ordersRes) ? ordersRes : []);
      setOrders(ordersData);
      setCustomers(Array.isArray(customersRes?.data) ? customersRes.data : (Array.isArray(customersRes) ? customersRes : []));
      const itemsArray = Array.isArray(itemsRes?.data) ? itemsRes.data : (Array.isArray(itemsRes) ? itemsRes : []);
      setItems(itemsArray.filter(Boolean));
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ customer: '', orderDate: new Date().toISOString().slice(0,10), status: 'Pending', notes: '', items: [] });
    setShowModal(true);
  };

  const openEdit = (order) => {
    setEditing(order);
    setForm({
      customer: order.customer?._id || order.customer,
      orderDate: order.orderDate ? order.orderDate.slice(0,10) : new Date().toISOString().slice(0,10),
      status: order.status || 'Pending',
      notes: order.notes || '',
      items: (order.items || []).map(li => ({ item: li.item?._id || li.item, quantity: li.quantity || 1, rate: li.rate || 0 })),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const addLine = () => setForm(prev => ({ ...prev, items: [...prev.items, { item: '', quantity: 1, rate: 0 }] }));
  const removeLine = (idx) => setForm(prev => ({ ...prev, items: prev.items.filter((_,i)=> i!==idx) }));
  const setLine = (idx, field, value) => setForm(prev => ({ ...prev, items: prev.items.map((it,i)=> i===idx ? { ...it, [field]: value } : it) }));

  const totalFor = (order) => (order.items || []).reduce((s, it) => s + (Number(it.quantity||0) * Number(it.rate||0)), 0);
  const formTotal = useMemo(() => totalFor(form), [form]);

  const save = async () => {
    try {
      if (!form.customer || form.items.length === 0) {
        toast.error('Select customer and add items');
        return;
      }
      const payload = { ...form, items: form.items.map(it => ({ ...it, quantity: Number(it.quantity||0), rate: Number(it.rate||0) })) };
      if (editing?._id) {
        await salesOrdersAPI.update(editing._id, payload);
        toast.success('Sales Order updated');
      } else {
        await salesOrdersAPI.create(payload);
        toast.success('Sales Order created');
      }
      closeModal();
      fetchAll();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save sales order');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this sales order?')) return;
    try {
      await salesOrdersAPI.delete(id);
      toast.success('Sales Order deleted');
      fetchAll();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const convert = async (order) => {
    try {
      const res = await salesOrdersAPI.convertToInvoice(order._id);
      const invoice = res?.data || res;
      toast.success('Converted to invoice');
      // Optionally open invoice in new tab
      if (invoice?._id) {
        // Prefer opening relative path so BrowserRouter basename is respected by the app
        const relative = `/edit-invoice/${invoice._id}`;
        try {
          // open in new tab within the same origin
          // open relative path under app basename so BrowserRouter handles origin and base
          const base = (window.__basename || import.meta.env.BASE_URL || '').replace(/\/$/, '') || '';
          const full = base + relative;
          window.open(full, '_blank');
        } catch (e) {
          window.open(relative, '_blank');
        }
      }
      fetchAll();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Convert failed');
    }
  };

  const printSO = (order) => {
    try {
      const cust = order.customer || {};
      const itemsRows = (order.items || []).map((it, idx) => {
        const named = items.find(x => (x?._id) === (it.item?._id || it.item)) || it.item || {};
        const name = named.name || it.name || `Item ${idx+1}`;
        const qty = Number(it.quantity||0);
        const rate = Number(it.rate||0);
        const amt = qty * rate;
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${idx+1}</td><td style="padding:8px;border-bottom:1px solid #eee">${name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${rate.toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${amt.toFixed(2)}</td></tr>`;
      }).join('');
      const total = totalFor(order);
      const soNo = `SO-${(order._id||'').slice(-6).toUpperCase()}`;
      const html = `
      <html><head><title>${soNo}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111}
        .container{max-width:900px;margin:24px auto;padding:16px}
        .header{display:flex;justify-content:space-between;align-items:center}
        .brand{display:flex;gap:12px;align-items:center}
        .brand img{height:48px}
        .muted{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th{background:#f8fafc;font-size:12px;text-transform:uppercase;letter-spacing:.02em;color:#475569;text-align:left;padding:8px}
        td{font-size:14px}
        .totals{margin-top:12px;display:flex;justify-content:flex-end}
        .badge{background:#eab3081a;color:#a16207;padding:2px 8px;border-radius:9999px;font-size:12px}
      </style></head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">
              ${company?.logoUrl ? `<img src="${company.logoUrl}" />` : ''}
              <div>
                <div style="font-weight:700;font-size:18px">${company?.name || 'Company'}</div>
                <div class="muted">${company?.address || ''}</div>
                <div class="muted">${company?.gstin ? 'GSTIN: '+company.gstin : ''}</div>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;font-size:18px">Sales Order</div>
              <div class="muted">${soNo}</div>
              <div class="muted">Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : ''}</div>
              <div><span class="badge">${order.status || 'Pending'}</span></div>
            </div>
          </div>

          <div style="display:flex;gap:24px;margin-top:16px">
            <div style="flex:1">
              <div style="font-weight:600">Bill To</div>
              <div>${cust?.firmName || cust?.name || ''}</div>
              <div class="muted">${cust?.billingAddress || cust?.firmAddress || ''}</div>
              ${cust?.gstNo ? `<div class="muted">GSTIN: ${cust.gstNo}</div>` : ''}
            </div>
          </div>

          <table>
            <thead><tr><th>#</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>${itemsRows || `<tr><td colspan="5" style="padding:12px;text-align:center;color:#64748b">No items</td></tr>`}</tbody>
          </table>

          <div class="totals">
            <table style="max-width:320px">
              <tr><td style="padding:6px;color:#475569">Subtotal</td><td style="padding:6px;text-align:right;font-weight:600">₹${total.toFixed(2)}</td></tr>
            </table>
          </div>

          ${company?.terms?.length ? `<div style="margin-top:16px"><div style="font-weight:600;margin-bottom:6px">Terms</div><ul style="margin:0;padding-left:18px;color:#475569;font-size:12px">${company.terms.map(t=>`<li>${t}</li>`).join('')}</ul></div>`:''}
        </div>
      </body></html>`;

      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
    } catch (e) {
      console.error(e);
      toast.error('Failed to print');
    }
  };

  const columns = [
    { key: 'number', label: 'SO #', render: (_v, row) => `SO-${String(row._id || '').slice(-6).toUpperCase()}` },
    { key: 'customer', label: 'Customer', render: (_v, row) => row.customer?.firmName || row.customer?.name || '—' },
    { key: 'orderDate', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '' },
    { key: 'total', label: 'Total', render: (_v, row) => formatCurrency(totalFor(row)) },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions', render: (_v, row) => (
      <div className="flex gap-2">
        <Button size="xs" variant="secondary" onClick={() => openEdit(row)}>Edit</Button>
        <Button size="xs" variant="outline" onClick={() => printSO(row)}>Print</Button>
        <Button size="xs" variant="success" onClick={() => convert(row)}>Convert</Button>
        <Button size="xs" variant="danger" onClick={() => remove(row._id)}>Delete</Button>
      </div>
    ) }
  ];

  const filtered = useMemo(() => {
    let data = Array.isArray(orders) ? orders : [];
    if (filters.status !== 'all') data = data.filter(o => (o.status || '').toLowerCase() === filters.status.toLowerCase());
    if (filters.customer) data = data.filter(o => (o.customer?._id || o.customer) === filters.customer);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(o => (o.customer?.firmName || o.customer?.name || '').toLowerCase().includes(q) || (o.notes || '').toLowerCase().includes(q));
    }
    if (filters.dateFrom) data = data.filter(o => new Date(o.orderDate) >= new Date(filters.dateFrom));
    if (filters.dateTo) data = data.filter(o => new Date(o.orderDate) <= new Date(filters.dateTo));
    return data;
  }, [orders, filters]);

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} orders?`)) return;
    for (const id of selected) await salesOrdersAPI.delete(id);
    setSelected([]);
    fetchAll();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sales Orders</h1>
            <p className="text-gray-600">Manage, print, and convert sales orders to invoices</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openNew}>New Sales Order</Button>
            {selected.length > 0 && (
              <Button variant="danger" onClick={bulkDelete}>Delete Selected</Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-gray-600">Status</label>
              <select value={filters.status} onChange={(e)=> setFilters(prev=>({...prev,status:e.target.value}))} className="w-full px-3 py-2 border rounded-lg">
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Customer</label>
              <select value={filters.customer} onChange={(e)=> setFilters(prev=>({...prev,customer:e.target.value}))} className="w-full px-3 py-2 border rounded-lg">
                <option value="">All</option>
                {customers.map(c => (<option key={c._id} value={c._id}>{c.firmName || c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">From</label>
              <input type="date" value={filters.dateFrom} onChange={(e)=> setFilters(prev=>({...prev,dateFrom:e.target.value}))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-600">To</label>
              <input type="date" value={filters.dateTo} onChange={(e)=> setFilters(prev=>({...prev,dateTo:e.target.value}))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Search</label>
              <input type="text" value={filters.search} onChange={(e)=> setFilters(prev=>({...prev,search:e.target.value}))} placeholder="Customer or notes" className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-8">Loading…</div>
          ) : (
            <Table
              columns={[{ key: 'select', label: '', render: (_v,row) => (
                <input type="checkbox" checked={selected.includes(row._id)} onChange={(e)=> setSelected(prev=> e.target.checked ? [...prev,row._id] : prev.filter(id=>id!==row._id))} />
              ) }, ...columns]}
              data={filtered}
              sortable
              pagination
              pageSize={10}
            />
          )}
        </div>

        {/* Create/Edit Modal */}
        <Modal isOpen={showModal} onClose={closeModal} title={editing ? 'Edit Sales Order' : 'New Sales Order'} size="large">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Customer</label>
                <select value={form.customer} onChange={(e)=> setForm(prev=>({...prev,customer:e.target.value}))} className="w-full border rounded px-3 py-2" required>
                  <option value="">Select</option>
                  {customers.map(c=> (<option key={c._id} value={c._id}>{c.firmName || c.name}</option>))}
                </select>
              </div>
              <InputField label="Order Date" type="date" value={form.orderDate} onChange={(e)=> setForm(prev=>({...prev,orderDate:e.target.value}))} />
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select value={form.status} onChange={(e)=> setForm(prev=>({...prev,status:e.target.value}))} className="w-full border rounded px-3 py-2">
                  <option>Pending</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Items</div>
                <Button size="sm" variant="secondary" onClick={addLine}>Add Item</Button>
              </div>
              <div className="table-mobile-wrapper">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left">Item</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Rate</th>
                      <th className="px-2 py-2 text-right">Amount</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((li, idx) => {
                      const amt = (Number(li.quantity||0) * Number(li.rate||0));
                      return (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-2">
                            <select value={li.item} onChange={(e)=> setLine(idx,'item',e.target.value)} className="w-full border rounded px-2 py-1">
                              <option value="">Select</option>
                              {items.map(it => (<option key={it._id} value={it._id}>{it.name}</option>))}
                            </select>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input type="number" min={1} value={li.quantity} onChange={(e)=> setLine(idx,'quantity', Number(e.target.value||'0'))} className="w-24 text-right border rounded px-2 py-1" />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input type="number" min={0} step="0.01" value={li.rate} onChange={(e)=> setLine(idx,'rate', Number(e.target.value||'0'))} className="w-28 text-right border rounded px-2 py-1" />
                          </td>
                          <td className="px-2 py-2 text-right font-medium">{formatCurrency(amt)}</td>
                          <td className="px-2 py-2 text-right"><Button size="xs" variant="danger" onClick={()=> removeLine(idx)}>Remove</Button></td>
                        </tr>
                      )
                    })}
                    {form.items.length === 0 && (
                      <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-500">No items. Add one.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2 text-sm"><span className="text-gray-600 mr-2">Subtotal:</span><span className="font-semibold">{formatCurrency(formTotal)}</span></div>
            </div>

            <InputField label="Notes" as="textarea" value={form.notes} onChange={(e)=> setForm(prev=>({...prev,notes:e.target.value}))} />

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" onClick={save}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default EnhancedSalesOrderManagement;
