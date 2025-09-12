import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { itemsAPI } from '../api/items';
import { invoicesAPI } from '../api/invoices';
import { formatCurrency } from '../utils/dateHelpers';
import { getApiBaseUrl, getAppBasePath } from '../utils/appBase';
import { toast } from 'react-hot-toast';

const PosQuickBilling = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  // Export/SEZ options for POS
  const [exportInfo, setExportInfo] = useState({ 
    isExport: false, 
    exportType: '', 
    withTax: false, 
    shippingBillNo: '', 
    shippingBillDate: '', 
    portCode: '' 
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await itemsAPI.getAll();
        const itemsData = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setItems(itemsData);
        console.log(`[POS] Loaded ${itemsData.length} items`);
      } catch (error) {
        console.error('[POS] Failed to load items:', error);
        toast.error('Failed to load items');
      }
    })();
  }, []);

  const addEmpty = () => setSaleItems(prev => ([...prev, { id: Date.now(), itemId: '', quantity: 1, price: 0, taxSlab: 0 }]));

  const updateLine = (i, field, val) => {
    const copy = [...saleItems];
    copy[i] = { ...copy[i], [field]: val };
    // if selecting an item, populate defaults
    if (field === 'itemId') {
      const sel = items.find(x => x._id === val);
      if (sel) {
        copy[i].price = sel.rate ?? sel.price ?? 0;
        copy[i].taxSlab = sel.taxSlab ?? 0;
      }
    }
    setSaleItems(copy);
  };

  const removeLine = (i) => setSaleItems(prev => prev.filter((_, idx) => idx !== i));

  // Compute totals with proportional discount and correct Inclusive handling
  const totalBase = saleItems.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0) || 0;

  const totals = saleItems.reduce((acc, it) => {
    const lineBase = Number(it.price || 0) * Number(it.quantity || 0);
    const tax = Number(it.taxSlab || 0) || 0;
    const propDiscount = totalBase > 0 ? (lineBase / totalBase) * Number(discount || 0) : 0;
    const priceType = String(it.priceType ?? it.item?.priceType ?? 'Exclusive');

    if (priceType === 'Inclusive' && tax) {
      const discountedInclusive = Math.max(0, lineBase - propDiscount);
      const taxable = discountedInclusive / (1 + tax / 100);
      const taxAmt = Math.max(0, discountedInclusive - taxable);
      const lineTotal = discountedInclusive;
      acc.subtotal += taxable;
      acc.tax += taxAmt;
      acc.grand += lineTotal;
    } else {
      const taxable = Math.max(0, lineBase - propDiscount);
      const taxAmt = taxable * (tax / 100);
      const lineTotal = taxable + taxAmt;
      acc.subtotal += taxable;
      acc.tax += taxAmt;
      acc.grand += lineTotal;
    }
    return acc;
  }, { subtotal: 0, tax: 0, grand: 0 });

  const subtotal = totals.subtotal;
  const totalTax = totals.tax;
  const grandTotal = totals.grand;
  const change = Math.max(0, Number(paidAmount || 0) - grandTotal);

  const handleSavePOS = async () => {
    if (saleItems.length === 0) {
      return toast.error('Add items to the bill');
    }
    
    if (Number(paidAmount || 0) < Number(grandTotal || 0)) {
      return toast.error('POS requires full payment (no credit allowed)');
    }
    
    setLoading(true);
    try {
      const itemsForBackend = saleItems.map(({ id, ...rest }) => ({ 
        ...rest, 
        item: rest.itemId,
        quantity: Number(rest.quantity || 1),
        rate: Number(rest.price || 0),
        taxSlab: Number(rest.taxSlab || 0)
      }));
      
      const payload = {
        billingType: 'POS',
        items: itemsForBackend,
        customerName: customerName || undefined,
        paidAmount: Number(paidAmount || 0),
        discount: Number(discount || 0),
        exportInfo: exportInfo.isExport ? {
          isExport: true,
          exportType: exportInfo.exportType,
          withTax: !!exportInfo.withTax,
          shippingBillNo: exportInfo.shippingBillNo || '',
          shippingBillDate: exportInfo.shippingBillDate || undefined,
          portCode: exportInfo.portCode || '',
        } : undefined
      };

      console.log('[POS] Creating invoice with payload:', payload);
      const res = await invoicesAPI.create(payload);
      
      toast.success('POS Invoice created successfully!');
      
      // Reset form
      setSaleItems([]);
      setPaidAmount(0);
      setDiscount(0);
      setCustomerName('');
      setPaymentMethod('Cash');
      setExportInfo({ isExport: false, exportType: '', withTax: false, shippingBillNo: '', shippingBillDate: '', portCode: '' });
      
      // Open thermal print if ID available
      const id = res?._id || res?.invoiceId || res?.id;
      if (id) {
        try {
          const pdfUrl = invoicesAPI.publicPdfUrl(id, null, 'thermal');
          window.open(pdfUrl, '_blank');
        } catch (e) {
          const apiBase = getApiBaseUrl() || '';
          const prefix = apiBase ? apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') : (getAppBasePath() || '').replace(/\/$/, '');
          const openUrl = `${prefix}/invoices/public/${id}/pdf?format=thermal`;
          window.open(openUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('[POS] Error creating invoice:', err); 
      toast.error('Failed to save POS invoice');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Enhanced Header */}
        <div className="mb-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                POS Quick Billing
              </h1>
              <p className="text-gray-600 mt-1">
                Fast retail billing with instant payment processing
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/billing')}
                className="flex items-center justify-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Advanced Billing
              </button>
              
              <button
                onClick={() => navigate('/invoices')}
                className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Invoices
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Sale Items</h2>
                <button
                  onClick={addEmpty}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>

              {/* Customer Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name (Optional)</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {saleItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p>No items added yet</p>
                    <p className="text-sm">Click "Add Item" to start building your sale</p>
                  </div>
                ) : (
                  saleItems.map((line, idx) => (
                    <div key={line.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                          <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            value={line.itemId} 
                            onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                          >
                            <option value="">Select item</option>
                            {items.map(it => (
                              <option key={it._id} value={it._id}>
                                {it.name} - {formatCurrency(it.rate || it.price || 0)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                          <input 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            type="number" 
                            min="1"
                            value={line.quantity} 
                            onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value || 1))} 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                          <input 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={line.price} 
                            onChange={(e) => updateLine(idx, 'price', parseFloat(e.target.value || 0))} 
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tax %</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={line.taxSlab}
                            onChange={(e) => updateLine(idx, 'taxSlab', parseFloat(e.target.value))}
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </div>
                        
                        <div className="flex items-end">
                          <div className="text-sm text-gray-600">
                            <span className="block text-xs font-medium text-gray-700 mb-1">Line Total</span>
                            <span className="font-semibold text-lg">
                              {formatCurrency((line.price || 0) * (line.quantity || 1))}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-end justify-end">
                          <button 
                            className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                            onClick={() => removeLine(idx)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Export Options */}
              {exportInfo.isExport && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-3">Export Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={exportInfo.exportType}
                      onChange={(e) => setExportInfo(prev => ({ ...prev, exportType: e.target.value }))}
                      className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Export Type</option>
                      <option value="EXPORT">Overseas Export</option>
                      <option value="SEZ">SEZ</option>
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Port Code"
                      value={exportInfo.portCode}
                      onChange={(e) => setExportInfo(prev => ({ ...prev, portCode: e.target.value }))}
                      className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <label className="flex items-center mt-3">
                    <input
                      type="checkbox"
                      checked={exportInfo.withTax}
                      onChange={(e) => setExportInfo(prev => ({ ...prev, withTax: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-blue-700">With Tax (WPAY)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Billing Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing Summary</h2>
              
              {/* Totals */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">{formatCurrency(totalTax)}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Grand Total:</span>
                    <span className="font-bold text-xl text-gray-900">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Discount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter discount amount"
                />
              </div>

              {/* Payment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Paid Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter paid amount"
                />
                
                {change > 0 && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Change:</span>
                      <span className="font-semibold text-green-800">{formatCurrency(change)}</span>
                    </div>
                  </div>
                )}
                
                {Number(paidAmount || 0) < Number(grandTotal || 0) && grandTotal > 0 && (
                  <div className="mt-2 p-2 bg-red-50 rounded-lg">
                    <p className="text-red-700 text-xs">POS requires full payment - no credit allowed</p>
                  </div>
                )}
              </div>

              {/* Export Toggle */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportInfo.isExport}
                    onChange={(e) => setExportInfo(prev => ({ 
                      ...prev, 
                      isExport: e.target.checked,
                      exportType: e.target.checked ? prev.exportType : '',
                      withTax: e.target.checked ? prev.withTax : false
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Export Invoice</span>
                </label>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSavePOS}
                disabled={loading || saleItems.length === 0 || Number(paidAmount || 0) < Number(grandTotal || 0)}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Save & Print
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PosQuickBilling;