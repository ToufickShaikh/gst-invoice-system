import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';
import { formatCurrency } from '../utils/dateHelpers';
import AdvancedInvoicePrint from './AdvancedInvoicePrint';
import { cashDrawerAPI } from '../api/cashDrawer';

const EnhancedBillingForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: null,
    items: [],
    discountType: 'percentage', // 'percentage' or 'amount'
    discountValue: 0,
    shippingCharges: 0,
    notes: '',
    termsAndConditions: '',
    paymentTerms: '30', // days
    dueDate: '',
    status: 'draft' // draft, pending, paid, overdue
  });

  const [customers, setCustomers] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [autoCalculate, setAutoCalculate] = useState(true);
  // Payment controls
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  // Cash denominations for cash drawer recording
  const [cashDenoms, setCashDenoms] = useState({ d500:0,d200:0,d100:0,d50:0,d20:0,d10:0,d5:0,d2:0,d1:0 });
  const [drawerStatus, setDrawerStatus] = useState(null);
  // Change computation states
  const [changeSuggestions, setChangeSuggestions] = useState([]);
  const [selectedChangeDenoms, setSelectedChangeDenoms] = useState(null);

  // Customer form data - single form, derive type from GSTIN presence
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: ''
  });

  // Item form data
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    hsnCode: '',
    unit: 'pcs',
    sellingPrice: 0,
    taxRate: 18
  });

  // Invoice item data
  const [currentItem, setCurrentItem] = useState({
    item: '',
    name: '',
    description: '',
    hsnCode: '',
    quantity: 1,
    rate: 0,
    discount: 0,
    taxRate: 18,
    priceType: 'Exclusive',
    amount: 0
  });

  // Enhanced item management states
  const [selectedItems, setSelectedItems] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [bulkItemAction, setBulkItemAction] = useState('');

  // Searchable selectors state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Export details state
  const [exportInfo, setExportInfo] = useState({ isExport: false, exportType: '', withTax: false, shippingBillNo: '', shippingBillDate: '', portCode: '' });

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    setFormData(prev => ({
      ...prev,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
    // Load cash drawer status
    (async () => {
      try { const s = await cashDrawerAPI.getStatus(); setDrawerStatus(s); } catch (e) { console.warn('Drawer status load failed:', e?.message||e); }
    })();
  }, []);

  // Preselect customer when coming from Customers page
  useEffect(() => {
    try {
      const prefillId = sessionStorage.getItem('prefillCustomerId');
      if (prefillId && Array.isArray(customers) && customers.length) {
        const customer = customers.find(c => (c?._id || c?.id) === prefillId);
        if (customer) {
          setFormData(prev => ({ ...prev, customer }));
          toast.success(`Customer preselected: ${customer.firmName || customer.name}`);
        }
        sessionStorage.removeItem('prefillCustomerId');
      }
    } catch {}
  }, [customers]);

  useEffect(() => {
    if (autoCalculate) {
      calculateTotals();
    }
  }, [formData.items, formData.discountValue, formData.shippingCharges, autoCalculate]);

  // When toggling recordPaymentNow on, default paid to current total
  useEffect(() => {
    if (recordPaymentNow) {
      const t = calculateTotals();
      setPaidAmount(t.total || 0);
    } else {
      setPaidAmount(0);
    }
  }, [recordPaymentNow]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      // Handle different response structures
      const customersArray = Array.isArray(response) 
        ? response 
        : (Array.isArray(response.data) ? response.data : response.customers || []);
      setCustomers(customersArray);
      console.log('✅ Customers loaded:', customersArray.length);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      // Handle different response structures - match working Items.jsx pattern
      const itemsArray = Array.isArray(response?.data)
        ? response.data
        : (Array.isArray(response) ? response : []);
      
      // Filter out null/undefined items and format for billing
      const formattedItems = itemsArray
        .filter(item => item != null)
        .map(item => ({
          ...item,
          sellingPrice: item.rate || 0,
          quantityInStock: item.quantityInStock ?? 0,
          priceType: item.priceType || 'Exclusive',
          taxSlab: item.taxSlab ?? 18,
        }));
      
      setAvailableItems(formattedItems);
      console.log('✅ Items loaded:', formattedItems.length);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    }
  };

  // Helpers for GST calculations
  const extractStateCode = (stateString) => {
    if (!stateString) return null;
    if (stateString.includes('-')) return stateString.split('-')[0].trim();
    if (/^\d{2}$/.test(stateString)) return stateString;
    const map = { 'Tamil Nadu': '33', 'Maharashtra': '27', 'Karnataka': '29', 'Kerala': '32', 'Andhra Pradesh': '28', 'Telangana': '36', 'Gujarat': '24', 'Rajasthan': '08', 'Uttar Pradesh': '09', 'West Bengal': '19', 'Delhi': '07', 'Haryana': '06', 'Punjab': '03' };
    return map[stateString] || null;
  };
  const COMPANY_STATE_CODE = '33'; // TN

  const computeItemBreakup = (item, isInterState) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const taxRate = Number(item.taxRate ?? item.taxSlab ?? 18) || 0;
    const discountPct = Number(item.discount) || 0; // line-level percentage

    // Determine taxable per-unit based on price type
    const unitTaxable = (item.priceType === 'Inclusive')
      ? (rate / (1 + taxRate / 100))
      : rate;

    const baseAmount = unitTaxable * qty;
    const discountAmount = (baseAmount * discountPct) / 100;
    const discountedBase = baseAmount - discountAmount;

    const totalTax = (discountedBase * taxRate) / 100;
    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = totalTax;
    } else {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    }

    const lineTotal = discountedBase + totalTax;

    return { baseAmount, discountAmount, discountedBase, cgst, sgst, igst, totalTax, lineTotal, taxRate };
  };

  // Calculate single item payable amount using current customer state (for previews/UI)
  const calculateItemAmount = (item) => {
    const customerState = formData.customer?.state || '';
    const code = extractStateCode(customerState);
    const isInterState = !!code && code !== COMPANY_STATE_CODE;
    const k = computeItemBreakup(item, isInterState);
    return Math.round(k.lineTotal * 100) / 100;
  };

  const calculateTotals = () => {
    const customerState = formData.customer?.state || '';
    const isInterState = (() => {
      const code = extractStateCode(customerState);
      return !!code && code !== COMPANY_STATE_CODE;
    })();

    let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, totalDiscount = 0;

    formData.items.forEach((item) => {
      const k = computeItemBreakup(item, isInterState);
      subtotal += k.discountedBase; // taxable value after line discount
      totalCgst += k.cgst;
      totalSgst += k.sgst;
      totalIgst += k.igst;
      totalDiscount += k.discountAmount;
    });

    // Invoice-level discount
    let invoiceLevelDiscount = 0;
    if (formData.discountType === 'percentage') {
      invoiceLevelDiscount = (subtotal * (Number(formData.discountValue) || 0)) / 100;
    } else {
      invoiceLevelDiscount = Number(formData.discountValue) || 0;
    }

    const taxableAfterDiscount = Math.max(subtotal - invoiceLevelDiscount, 0);

    // Note: keeping tax amounts from line-level calc (more accurate). Shipping added after tax here.
    const shipping = Number(formData.shippingCharges) || 0;

    const totalBeforeRound = taxableAfterDiscount + totalCgst + totalSgst + totalIgst + shipping;
    const roundedTotal = Math.round(totalBeforeRound);
    const roundOff = Math.round((roundedTotal - totalBeforeRound) * 100) / 100;

    return {
      isInterState,
      subtotal: Math.round(subtotal * 100) / 100,
      lineDiscount: Math.round(totalDiscount * 100) / 100,
      invoiceDiscount: Math.round(invoiceLevelDiscount * 100) / 100,
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      totalBeforeRound: Math.round(totalBeforeRound * 100) / 100,
      roundOff,
      total: roundedTotal,
    };
  };

  // ===== Cash change-making helpers =====
  // Denominations used in India (no 2000 notes in backend)
  const denomOrder = [500, 100, 50, 20, 10, 5, 2, 1];

  function sumDenoms(d = {}) {
    return denomOrder.reduce((sum, v) => sum + v * (d[`d${v}`] || 0), 0);
  }

  function addDenoms(a = {}, b = {}) {
    const out = {};
    denomOrder.forEach(v => {
      out[`d${v}`] = (a[`d${v}`] || 0) + (b[`d${v}`] || 0);
    });
    return out;
  }

  function makeGreedyChange(amount, available = {}) {
    let remaining = amount;
    const result = {};
    for (const v of denomOrder) {
      const have = available[`d${v}`] || 0;
      const canUse = Math.min(have, Math.floor(remaining / v));
      if (canUse > 0) {
        result[`d${v}`] = canUse;
        remaining -= canUse * v;
      }
    }
    return { result, remaining };
  }

  function makePreferredChange(amount, available = {}) {
    // Prefer 20 and 10 first, then fallback greedy
    const preferredOrder = [20, 10, 500, 100, 50, 5, 2, 1];
    let remaining = amount;
    const result = {};
    for (const v of preferredOrder) {
      const have = available[`d${v}`] || 0;
      const canUse = Math.min(have, Math.floor(remaining / v));
      if (canUse > 0) {
        result[`d${v}`] = canUse;
        remaining -= canUse * v;
      }
    }
    return { result, remaining };
  }

  function makeSingleDenom(amount, available = {}) {
    // Try to return change with a single denomination if possible
    for (const v of denomOrder) {
      if (amount % v === 0) {
        const need = amount / v;
        if ((available[`d${v}`] || 0) >= need) {
          return { [`d${v}`]: need };
        }
      }
    }
    return null;
  }

  // Build change suggestions when recording cash payment
  useEffect(() => {
    if (!(recordPaymentNow && paymentMethod === 'Cash')) {
      setChangeSuggestions([]);
      setSelectedChangeDenoms(null);
      return;
    }

    // Compute change due locally to avoid TDZ with changeDue const defined later
    const t = calculateTotals();
    const cd = recordPaymentNow && paymentMethod === 'Cash'
      ? Math.max(0, Math.round((Number(paidAmount || 0) - Number(t.total || 0))))
      : 0;

    if (cd <= 0) {
      setChangeSuggestions([]);
      setSelectedChangeDenoms(null);
      return;
    }

    const available = addDenoms(drawerStatus?.denominations || {}, cashDenoms);
    const suggestions = [];

    const greedy = makeGreedyChange(cd, available);
    if (greedy.remaining === 0) suggestions.push({ label: 'Optimal', denoms: greedy.result });

    const pref = makePreferredChange(cd, available);
    if (pref.remaining === 0 && JSON.stringify(pref.result) !== JSON.stringify(greedy.result)) {
      suggestions.push({ label: 'Prefer 20/10', denoms: pref.result });
    }

    const single = makeSingleDenom(cd, available);
    if (single) suggestions.push({ label: 'Single denom', denoms: single });

    setChangeSuggestions(suggestions);
    setSelectedChangeDenoms(suggestions[0]?.denoms || null);
  }, [recordPaymentNow, paymentMethod, paidAmount, formData.items, formData.discountType, formData.discountValue, formData.shippingCharges, drawerStatus, cashDenoms]);

  const addItemToInvoice = () => {
    if (!currentItem.name || currentItem.quantity <= 0 || currentItem.rate <= 0) {
      toast.error('Please fill all required item fields');
      return;
    }

    const itemWithAmount = {
      ...currentItem,
      id: Date.now(),
      amount: 0 // will be computed in totals
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, itemWithAmount]
    }));

    // Reset current item
    setCurrentItem({
      item: '',
      name: '',
      description: '',
      hsnCode: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      taxRate: 18,
      priceType: 'Exclusive',
      amount: 0
    });

    toast.success('Item added to invoice');
  };

  const removeItemFromInvoice = (itemId) => {
    const item = formData.items.find(item => item.id === itemId);
    if (item) {
      setItemToDelete(item);
      setShowDeleteConfirm(true);
    }
  };

  const confirmRemoveItem = () => {
    if (itemToDelete) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemToDelete.id)
      }));
      toast.success('Item removed from invoice');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const handleBulkItemAction = () => {
    if (!bulkItemAction || selectedItems.length === 0) {
      toast.error('Please select items and action');
      return;
    }

    if (bulkItemAction === 'delete') {
      if (window.confirm(`Remove ${selectedItems.length} items from invoice?`)) {
        setFormData(prev => ({
          ...prev,
          items: prev.items.filter(item => !selectedItems.includes(item.id))
        }));
        toast.success(`${selectedItems.length} items removed from invoice`);
        setSelectedItems([]);
        setBulkItemAction('');
      }
    } else if (bulkItemAction === 'duplicate') {
      const itemsToDuplicate = formData.items.filter(item => selectedItems.includes(item.id));
      const duplicatedItems = itemsToDuplicate.map(item => ({
        ...item,
        id: Date.now() + Math.random(),
        name: `${item.name} (Copy)`
      }));
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, ...duplicatedItems]
      }));
      toast.success(`${selectedItems.length} items duplicated`);
      setSelectedItems([]);
      setBulkItemAction('');
    }
  };

  const updateInvoiceItem = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          return {
            ...updatedItem,
            amount: calculateItemAmount(updatedItem)
          };
        }
        return item;
      })
    }));
  };

  const selectExistingItem = (item) => {
    console.log('🔄 Selecting existing item:', item);
    setCurrentItem({
      item: item._id,
      name: item.name,
      description: item.description || '',
      hsnCode: item.hsnCode || '',
      quantity: 1,
      rate: item.sellingPrice || item.rate || 0,
      discount: 0,
      taxRate: item.taxSlab || item.taxRate || 18,
      priceType: item.priceType || 'Exclusive',
      amount: 0
    });
    toast.success(`Selected: ${item.name}`);
  };

  const createCustomer = async () => {
    try {
      // Derive type from GSTIN presence and map to backend fields
      const derivedType = (newCustomer.gstin || '').trim() ? 'B2B' : 'B2C';
      const payload = {
        customerType: derivedType,
        // For B2B, map name/address as firmName/firmAddress if dedicated fields are not present
        name: newCustomer.name,
        firmName: derivedType === 'B2B' ? (newCustomer.name || '') : undefined,
        firmAddress: derivedType === 'B2B' ? (newCustomer.address || '') : undefined,
        billingAddress: derivedType === 'B2C' ? (newCustomer.address || '') : undefined,
        contact: newCustomer.phone || '',
        email: newCustomer.email || '',
        gstNo: (newCustomer.gstin || '').trim(),
        // Provide a sensible default state to satisfy backend requirement; user can edit later
        state: '33-Tamil Nadu'
      };

      const created = await customersAPI.create(payload);
      toast.success('Customer created successfully');
      setShowCustomerForm(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        gstin: ''
      });
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const createItem = async () => {
    try {
      await itemsAPI.createItem(newItem);
      toast.success('Item created successfully');
      setShowItemForm(false);
      setNewItem({
        name: '',
        description: '',
        hsnCode: '',
        unit: 'pcs',
        sellingPrice: 0,
        taxRate: 18
      });
      fetchItems();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    }
  };

  const handleCreateInvoice = async (mode = 'pending') => {
    try {
      setLoading(true);
      if (!formData.customer) { toast.error('Please select a customer'); return; }
      if (formData.items.length === 0) { toast.error('Please add at least one item'); return; }

      const totals = calculateTotals();
      const payload = {
        customer: formData.customer?._id || formData.customer,
        items: formData.items.map(it => ({
          item: it.item?._id || it.item || undefined,
          name: it.name,
          description: it.description,
          hsnCode: it.hsnCode,
          quantity: Number(it.quantity||0),
          rate: Number(it.rate||0),
          discount: Number(it.discount||0),
          taxRate: Number(it.taxRate ?? it.taxSlab ?? 0),
        })),
        discount: formData.discountType === 'amount' ? Number(formData.discountValue||0) : 0,
        shippingCharges: Number(formData.shippingCharges||0),
        paidAmount: recordPaymentNow ? Number(paidAmount||0) : 0,
        paymentMethod: recordPaymentNow ? paymentMethod : '',
        billingType: 'invoice',
        exportInfo: exportInfo.isExport ? {
          isExport: true,
          exportType: exportInfo.exportType,
          withTax: !!exportInfo.withTax,
          shippingBillNo: exportInfo.shippingBillNo || '',
          shippingBillDate: exportInfo.shippingBillDate || undefined,
          portCode: exportInfo.portCode || '',
        } : undefined,
      };

      const created = await billingAPI.createInvoice(payload);
      setCurrentInvoice(created.invoice || created);

      // Record cash in drawer only if payment is Cash and paidAmount > 0
      try {
        if (recordPaymentNow && paymentMethod === 'Cash' && Number(paidAmount) > 0) {
          const inv = created.invoice || created; const invoiceId = inv?._id;
          if (invoiceId) {
            await cashDrawerAPI.recordSale({ invoiceId, amount: Number(paidAmount), denominations: cashDenoms });
            // Compute change and optionally remove from drawer
            const totalDue = Number(totals.total || 0);
            const change = Math.max(0, Math.round(Number(paidAmount) - totalDue));
            if (change > 0) {
              // Use selected suggestion if valid; else greedy
              const available = addDenoms(drawerStatus?.denominations || {}, cashDenoms);
              let chosen = selectedChangeDenoms;
              if (!chosen || sumDenoms(chosen) !== change) {
                const g = makeGreedyChange(change, available);
                if (g.remaining === 0) chosen = g.result;
              }
              if (chosen && sumDenoms(chosen) === change) {
                await cashDrawerAPI.adjust({ type: 'adjust-remove', denominations: chosen, reason: `Change returned for invoice ${inv.invoiceNumber || inv._id}` });
              } else {
                console.warn('Unable to compute exact change removal; skipped adjust-remove.');
              }
            }
            // Refresh drawer status
            try { const s = await cashDrawerAPI.getStatus(); setDrawerStatus(s); } catch {}
          }
        }
      } catch (e) {
        console.warn('Cash drawer update failed (non-blocking):', e);
      }
      
      toast.success(`Invoice ${mode === 'draft' ? 'saved as draft' : 'created'} successfully!`);
      
      if (mode !== 'draft') {
        setShowPrintModal(true);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = (mode) => {
    // mode: 'draft' | 'pending'
    return handleCreateInvoice(mode);
  };

  const totals = calculateTotals();
  const taxTotal = (Number(totals.cgst || 0) + Number(totals.sgst || 0) + Number(totals.igst || 0));
  const effectivePaid = recordPaymentNow ? Number(paidAmount || 0) : 0;
  const balanceDue = Math.max(0, Number(totals.total || 0) - effectivePaid);
  const changeDue = recordPaymentNow && paymentMethod === 'Cash' ? Math.max(0, Math.round(effectivePaid - Number(totals.total || 0))) : 0;

  return (
    <div className="space-y-8 pb-20 lg:pb-0 max-w-6xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        <div className="text-xs text-gray-600">Cash in drawer: <span className="font-semibold">{formatCurrency(drawerStatus?.totalCash || 0)}</span></div>
      </div>

      {/* Customer and Item Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
            <button
              onClick={() => setShowCustomerForm(!showCustomerForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add New Customer
            </button>
          </div>

          {showCustomerForm && (
            <div className="mb-6 p-4 border rounded-lg bg-white">
              <h3 className="text-lg font-medium mb-4">New Customer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Customer or Firm Name *"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone *"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="GSTIN (leave empty for B2C)"
                  value={newCustomer.gstin}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, gstin: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Address * (Firm Address for B2B)"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  rows="2"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={createCustomer}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Create Customer
                </button>
                <button
                  onClick={() => setShowCustomerForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Searchable Customer Select */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search and select customer (name/phone/GST)"
              value={
                customerSearch !== ''
                  ? customerSearch
                  : (formData.customer
                      ? `${(formData.customer.firmName || formData.customer.name) || ''}${(formData.customer.contact || formData.customer.phone) ? ` - ${formData.customer.contact || formData.customer.phone}` : ''}${(formData.customer.gstNo || formData.customer.gstin) ? ` | ${(formData.customer.gstNo || formData.customer.gstin)}` : ''}`
                      : '')
              }
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showCustomerDropdown && (
              <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-md shadow">
                {customers
                  .filter((c) => {
                    const q = customerSearch.trim().toLowerCase();
                    if (!q) return true;
                    const f = [c.firmName, c.name, c.contact, c.phone, c.email, c.gstNo, c.gstin]
                      .filter(Boolean)
                      .map((x) => String(x).toLowerCase())
                      .join(' ');
                    return f.includes(q);
                  })
                  .slice(0, 15)
                  .map((c) => {
                    const label = `${(c.firmName || c.name) || ''}${(c.contact || c.phone) ? ` - ${c.contact || c.phone}` : ''}${(c.gstNo || c.gstin) ? ` | ${(c.gstNo || c.gstin)}` : ''}`;
                    return (
                      <li
                        key={c._id}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                        onMouseDown={() => {
                          setFormData((prev) => ({ ...prev, customer: c }));
                          setCustomerSearch(label);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        {label}
                      </li>
                    );
                  })}
                {customers.length === 0 && (
                  <li className="px-3 py-2 text-sm text-gray-500">No customers found</li>
                )}
              </ul>
            )}
          </div>

          {formData.customer && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Selected Customer</h3>
              <p className="text-blue-800">{formData.customer.firmName || formData.customer.name}</p>
              <p className="text-blue-700 text-sm">{formData.customer.billingAddress || formData.customer.firmAddress}</p>
              <p className="text-blue-700 text-sm">{formData.customer.contact || formData.customer.phone} | {formData.customer.email}</p>
              {(formData.customer.gstNo || formData.customer.gstin) && (
                <p className="text-blue-700 text-sm">GSTIN: {formData.customer.gstNo || formData.customer.gstin}</p>
              )}
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Invoice Items</h2>
            <button
              onClick={() => setShowItemForm(!showItemForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              + Add New Item
            </button>
          </div>

          {showItemForm && (
            <div className="mb-6 p-4 border rounded-lg bg-white">
              <h3 className="text-lg font-medium mb-4">New Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Item Name *"
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="HSN Code"
                  value={currentItem.hsnCode}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, hsnCode: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Quantity *"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={1}
                />
                <input
                  type="number"
                  placeholder="Rate *"
                  value={currentItem.rate}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: Number(e.target.value) }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={0}
                />
                <select
                  value={currentItem.priceType}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, priceType: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Exclusive">Exclusive of GST</option>
                  <option value="Inclusive">Inclusive of GST</option>
                </select>
                <select
                  value={currentItem.taxRate}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[0,5,12,18,28].map(r => (<option key={r} value={r}>{r}%</option>))}
                </select>
                <input
                  type="number"
                  placeholder="Line Discount %"
                  value={currentItem.discount}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, discount: Number(e.target.value) }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={0}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={addItemToInvoice} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Add Item</button>
                <button onClick={() => setShowItemForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Add Item to Invoice */}
          <div className="mb-6 p-4 border rounded-lg bg-white">
            <h3 className="text-lg font-medium mb-4">Add Item to Invoice</h3>
            
            {/* Searchable existing items */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose item (type to search by name/HSN)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${availableItems.length} items...`}
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onFocus={() => setShowItemDropdown(true)}
                  onBlur={() => setTimeout(() => setShowItemDropdown(false), 150)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showItemDropdown && (
                  <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-md shadow">
                    {availableItems
                      .filter((it) => {
                        const q = itemSearch.trim().toLowerCase();
                        if (!q) return true;
                        const hay = [it.name, it.hsnCode]
                          .filter(Boolean)
                          .map((x) => String(x).toLowerCase())
                          .join(' ');
                        return hay.includes(q);
                      })
                      .slice(0, 20)
                      .map((it) => (
                        <li
                          key={it._id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800 flex items-center justify-between"
                          onMouseDown={() => {
                            selectExistingItem(it);
                            setItemSearch('');
                            setShowItemDropdown(false);
                          }}
                        >
                          <span>
                            {it.name} {it.hsnCode ? `(HSN: ${it.hsnCode})` : ''}
                          </span>
                          <span className="text-gray-500">
                            {formatCurrency(it.sellingPrice || it.rate || 0)}
                          </span>
                        </li>
                      ))}
                    {availableItems.length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-500">No items found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Item Name *"
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <input
                type="number"
                placeholder="Qty *"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Rate *"
                value={currentItem.rate}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Disc %"
                value={currentItem.discount}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Tax %"
                value={currentItem.taxRate}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <input
                type="text"
                placeholder="HSN Code"
                value={currentItem.hsnCode}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, hsnCode: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-4">
                  Amount: {formatCurrency(calculateItemAmount(currentItem))}
                </span>
                <button
                  onClick={addItemToInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Items List */}
          {formData.items.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="bg-blue-50 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {selectedItems.length} item(s) selected
                    </span>
                    <div className="flex items-center space-x-3">
                      <select
                        value={bulkItemAction}
                        onChange={(e) => setBulkItemAction(e.target.value)}
                        className="px-3 py-1 border border-blue-300 rounded-md text-sm"
                      >
                        <option value="">Select Action</option>
                        <option value="duplicate">Duplicate Items</option>
                        <option value="delete">Remove Items</option>
                      </select>
                      <button
                        onClick={handleBulkItemAction}
                        className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="table-mobile-wrapper">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === formData.items.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(formData.items.map(item => item.id));
                            } else {
                              setSelectedItems([]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disc%</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax%</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item) => (
                      <tr key={item.id} className={selectedItems.includes(item.id) ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(prev => [...prev, item.id]);
                              } else {
                                setSelectedItems(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500">{item.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.hsnCode || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateInvoiceItem(item.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.hsnCode}
                            onChange={(e) => updateInvoiceItem(item.id, 'hsnCode', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateInvoiceItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateInvoiceItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => updateInvoiceItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => removeItemFromInvoice(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Totals and Additional Charges */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additional Charges */}
        <div className="p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Charges & Settings</h3>
          
          <div className="space-y-4">
            {/* Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
              <div className="flex gap-2">
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percentage">%</option>
                  <option value="amount">₹</option>
                </select>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Discount"
                />
              </div>
            </div>

            {/* Shipping */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Charges</label>
              <input
                type="number"
                value={formData.shippingCharges}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingCharges: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Shipping charges"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment terms in days"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Record payment now */}
            <div className="mt-6 p-4 border rounded-lg bg-white">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={recordPaymentNow}
                  onChange={(e) => setRecordPaymentNow(e.target.checked)}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                Record payment now
              </label>

              {recordPaymentNow && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className={`w-full text-sm font-medium ${effectivePaid >= totals.total ? 'text-green-700' : (effectivePaid > 0 ? 'text-yellow-700' : 'text-gray-700')}`}>
                      {effectivePaid >= totals.total ? 'Will be marked as PAID' : (effectivePaid > 0 ? 'Will be marked as PARTIAL' : 'Will be marked as PENDING')}
                    </div>
                  </div>
                </div>
              )}

              {recordPaymentNow && paymentMethod === 'Cash' && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Cash denominations (for drawer)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[500,100,50,20,10,5,2,1].map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <label className="text-xs w-12">₹{v}</label>
                        <input
                          type="number" min={0}
                          value={cashDenoms[`d${v}`]}
                          onChange={(e)=> setCashDenoms(prev => ({ ...prev, [`d${v}`]: parseInt(e.target.value||'0',10) }))}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Change suggestions */}
                  <div className="mt-3 p-3 border rounded bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800">Change to return:</div>
                      <div className={`text-sm font-bold ${changeDue>0 ? 'text-red-700':'text-gray-700'}`}>{formatCurrency(changeDue)}</div>
                    </div>
                    {changeDue > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 mb-1">Suggestions</div>
                        <div className="flex flex-wrap gap-2">
                          {changeSuggestions.length === 0 && (
                            <span className="text-xs text-gray-500">No exact combination available with current drawer</span>
                          )}
                          {changeSuggestions.map((opt, idx) => {
                            const text = denomOrder
                              .filter(v => (opt.denoms[`d${v}`]||0) > 0)
                              .map(v => `₹${v}×${opt.denoms[`d${v}`]}`)
                              .join(' + ');
                            const isSelected = selectedChangeDenoms && JSON.stringify(selectedChangeDenoms) === JSON.stringify(opt.denoms);
                            return (
                              <button key={idx} type="button" onClick={()=> setSelectedChangeDenoms(opt.denoms)}
                                className={`px-2 py-1 rounded text-xs border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300 hover:bg-blue-50'}`}
                                title={opt.label}
                              >{text || opt.label}</button>
                            );
                          })}
                          {selectedChangeDenoms && (
                            <button type="button" onClick={()=> setSelectedChangeDenoms(null)} className="px-2 py-1 rounded text-xs border bg-white text-gray-600">Clear</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Totals */}
        <div className="p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Invoice Summary</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-blue-800">Taxable (Subtotal):</span><span className="font-medium text-blue-900">{formatCurrency(totals.subtotal)}</span></div>
            {totals.lineDiscount > 0 && (
              <div className="flex justify-between"><span className="text-blue-800">Line Discount:</span><span className="font-medium text-red-600">-{formatCurrency(totals.lineDiscount)}</span></div>
            )}
            {totals.invoiceDiscount > 0 && (
              <div className="flex justify-between"><span className="text-blue-800">Invoice Discount:</span><span className="font-medium text-red-600">-{formatCurrency(totals.invoiceDiscount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-blue-800">CGST:</span><span className="font-medium text-blue-900">{formatCurrency(totals.cgst)}</span></div>
            <div className="flex justify-between"><span className="text-blue-800">SGST:</span><span className="font-medium text-blue-900">{formatCurrency(totals.sgst)}</span></div>
            <div className="flex justify-between"><span className="text-blue-800">IGST:</span><span className="font-medium text-blue-900">{formatCurrency(totals.igst)}</span></div>
            {formData.shippingCharges > 0 && (
              <div className="flex justify-between"><span className="text-blue-800">Shipping:</span><span className="font-medium text-blue-900">{formatCurrency(formData.shippingCharges)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-blue-800">Round-off:</span><span className="font-medium text-blue-900">{formatCurrency(totals.roundOff)}</span></div>
            <div className="border-t border-blue-200 pt-2" />
            <div className="flex justify-between text-base"><span className="text-blue-900 font-semibold">Grand Total:</span><span className="text-blue-900 font-bold">{formatCurrency(totals.total)}</span></div>

            {/* Payment summary if recording now */}
            {recordPaymentNow && (
              <>
                <div className="flex justify-between"><span className="text-blue-800">Paid Now:</span><span className="font-medium text-green-700">{formatCurrency(effectivePaid)}</span></div>
                <div className={`flex justify-between`}><span className="text-blue-800">Balance Due:</span><span className={`font-semibold ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(balanceDue)}</span></div>
              </>
            )}
          </div>

          <div className="mt-4">
            <label className="flex items-center text-sm text-blue-800">
              <input
                type="checkbox"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Auto-calculate totals
            </label>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Internal notes (not visible on invoice)"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
          <textarea
            value={formData.termsAndConditions}
            onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Terms and conditions (visible on invoice)"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <button
          onClick={() => saveInvoice('draft')}
          disabled={loading}
          className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save as Draft'}
        </button>
        
        <button
          onClick={() => saveInvoice('pending')}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
        
        <button
          onClick={() => navigate('/invoices')}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Remove Item</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to remove "{itemToDelete.name}" from this invoice?
                </p>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-600">
                    <p>Quantity: {itemToDelete.quantity}</p>
                    <p>Rate: {formatCurrency(itemToDelete.rate)}</p>
                    <p>Amount: {formatCurrency(itemToDelete.amount)}</p>
                  </div>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setItemToDelete(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRemoveItem}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && currentInvoice && (
        <AdvancedInvoicePrint
          invoice={currentInvoice}
          isVisible={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            navigate('/invoices');
          }}
        />
      )}
    </div>
  );
};

export default EnhancedBillingForm;
