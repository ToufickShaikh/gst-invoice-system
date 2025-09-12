import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { itemsAPI } from '../api/items';
import { invoicesAPI } from '../api/invoices';
import { getApiBaseUrl, getAppBasePath } from '../utils/appBase';

// Feature-based imports
import POSItemList from '../features/pos/components/POSItemList';
import POSBillingSummary from '../features/pos/components/POSBillingSummary';
import { usePOSCalculations } from '../features/pos/hooks/usePOSCalculations';

const PosQuickBilling = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  const [exportInfo, setExportInfo] = useState({ 
    isExport: false, 
    exportType: '', 
    withTax: false, 
    shippingBillNo: '', 
    shippingBillDate: '', 
    portCode: '' 
  });

  const { subtotal, totalTax, grandTotal } = usePOSCalculations(saleItems, discount);
  const change = Math.max(0, Number(paidAmount || 0) - grandTotal);

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
      
      setSaleItems([]);
      setPaidAmount(0);
      setDiscount(0);
      setCustomerName('');
      setPaymentMethod('Cash');
      setExportInfo({ isExport: false, exportType: '', withTax: false, shippingBillNo: '', shippingBillDate: '', portCode: '' });
      
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
      <div className="responsive-padding">
        {/* Modern Header */}
        <div className="page-header">
          <div className="flex flex-col space-y-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="slide-in">
              <h1 className="page-title">POS Quick Billing</h1>
              <p className="page-subtitle">Fast retail billing with instant payment processing</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 scale-in">
              <button
                onClick={() => navigate('/billing')}
                className="btn-enhanced bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Advanced Billing
              </button>
              
              <button
                onClick={() => navigate('/invoices')}
                className="btn-enhanced btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Invoices
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
          {/* Items Section */}
          <div className="lg:col-span-2">
            {/* Customer Info */}
            <div className="form-section-modern mb-8">
              <div className="form-grid-modern">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="input-enhanced"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="select-modern"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
            </div>

            <POSItemList
              saleItems={saleItems}
              items={items}
              updateLine={updateLine}
              removeLine={removeLine}
              addEmpty={addEmpty}
            />

            {/* Export Options */}
            {exportInfo.isExport && (
              <div className="mt-8 form-section-modern bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Export Details</h3>
                <div className="form-grid-modern">
                  <select
                    value={exportInfo.exportType}
                    onChange={(e) => setExportInfo(prev => ({ ...prev, exportType: e.target.value }))}
                    className="select-modern"
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
                    className="input-enhanced"
                  />
                </div>
                
                <label className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    checked={exportInfo.withTax}
                    onChange={(e) => setExportInfo(prev => ({ ...prev, withTax: e.target.checked }))}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  />
                  <span className="text-sm font-medium text-blue-700">With Tax (WPAY)</span>
                </label>
              </div>
            )}
          </div>

          {/* Billing Summary */}
          <div className="lg:col-span-1">
            <POSBillingSummary
              subtotal={subtotal}
              totalTax={totalTax}
              grandTotal={grandTotal}
              discount={discount}
              setDiscount={setDiscount}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
              change={change}
              exportInfo={exportInfo}
              setExportInfo={setExportInfo}
              onSave={handleSavePOS}
              loading={loading}
              saleItems={saleItems}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PosQuickBilling;