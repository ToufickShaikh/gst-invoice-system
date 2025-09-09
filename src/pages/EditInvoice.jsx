import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { getApiBaseUrl, getAppBasePath } from '../utils/appBase';
import { calculateTax } from '../utils/taxCalculations';
import { formatCurrency } from '../utils/dateHelpers';

import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';

import Layout from '../components/Layout';
import InputField from '../components/InputField';
import Button from '../components/Button';
import Select from 'react-select'; // Using react-select for searchable dropdowns

const EditInvoice = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [invoiceData, setInvoiceData] = useState(null);
    const [isPOS, setIsPOS] = useState(false);
    const [summary, setSummary] = useState({
        fetchInitialData();
    }, [id]);

    // Recalculate summary whenever invoice data changes
    useEffect(() => {
        if (!invoiceData || !customers.length) return;

        // Find the full customer object to determine if the sale is inter-state for tax calculation
        const customer = customers.find(c => c._id === invoiceData.customer);
        if (!customer) return; // Don't calculate if customer not found yet

        const isInterState = customer.firmAddress && !customer.firmAddress.toLowerCase().includes('maharashtra');

        const totalBeforeDiscount = (invoiceData.items || []).reduce((sum, item) => {
            const price = item.price || item.item?.price || 0;
            return sum + (price * item.quantity);
        }, 0);

        const itemsWithTax = (invoiceData.items || []).map(billItem => {
            if (!billItem.item && (billItem.price == null)) return null;
            const price = Number((billItem.price ?? billItem.rate ?? billItem.item?.rate) || 0);
            const taxSlab = Number((billItem.taxSlab ?? billItem.taxRate ?? billItem.item?.taxSlab) || 0);
            const priceType = String(billItem.priceType ?? billItem.item?.priceType ?? 'Exclusive');

            const qty = Number(billItem.quantity || 0);
            const itemTotal = price * qty;
            const discountAmount = totalBeforeDiscount > 0 ? (itemTotal / totalBeforeDiscount) * (Number(invoiceData.discount) || 0) : 0;

            let taxableAmount = 0;
            if (priceType === 'Inclusive' && taxSlab) {
                // Apply discount to the inclusive line amount first, then derive taxable base
                const discountedInclusive = Math.max(0, itemTotal - discountAmount);
                taxableAmount = discountedInclusive / (1 + taxSlab / 100);
            } else {
                taxableAmount = itemTotal - discountAmount;
            }

            if (taxableAmount < 0) taxableAmount = 0;
            const tax = calculateTax(taxableAmount, taxSlab, isInterState);

            return { ...billItem, taxableAmount, tax };
        }).filter(Boolean);

        const totalBeforeTax = itemsWithTax.reduce((sum, item) => sum + item.taxableAmount, 0);
        const totalTax = itemsWithTax.reduce((sum, item) => sum + item.tax.total, 0);
        const grandTotal = totalBeforeTax + totalTax + (invoiceData.shippingCharges || 0);
        const balance = grandTotal - (invoiceData.paidAmount || 0);

        setSummary({ totalBeforeTax, totalTax, grandTotal, balance });

    }, [invoiceData, customers]);

    const fetchInitialData = async () => { // This function is well-structured.
        setLoading(true);
        setError(null); // Reset error state on new fetch
        try {
            const [customersRes, itemsRes, invoiceRes] = await Promise.all([
                customersAPI.getAll(),
                itemsAPI.getAll(),
                billingAPI.getInvoiceById(id),
            ]);

            const customersList = customersRes || [];
            const itemsList = itemsRes || [];
            const fetchedInvoice = invoiceRes;

            if (!fetchedInvoice) {
                throw new Error('Could not load the invoice. It might have been deleted.');
            }

            // Map quantityInStock to stock for consistency
            const itemsWithStock = itemsList.map(item => ({
                ...item,
                stock: item.quantityInStock ?? 0
            }));

            setCustomers(customersList);
            setItems(itemsWithStock);
            setInvoiceData({
                ...fetchedInvoice,
                // Handle case where customer might be null or missing from the DB
                customer: fetchedInvoice.customer?._id || '',
                items: (fetchedInvoice.items || []).map((item, index) => ({
                        ...item,
                        id: item.id || Date.now() + index, // Add unique ID if missing
                        itemId: item.item?._id || '',
                        price: item.price ?? item.rate ?? (item.item?.rate ?? 0),
                        taxSlab: item.taxSlab ?? item.taxRate ?? (item.item?.taxSlab ?? 0),
                        priceType: item.priceType ?? item.item?.priceType ?? 'Exclusive',
                        name: item.name || item.item?.name || ''
                    })),
                exportInfo: {
                  isExport: false,
                  exportType: '',
                  withTax: false,
                  shippingBillNo: '',
                  shippingBillDate: '',
                  portCode: '',
                  ...(fetchedInvoice.exportInfo || {})
                }
            });

        } catch (err) {
            console.error("Error fetching initial data:", err);
            setError('Failed to load necessary data. Please check your connection and try again.');
            toast.error('Failed to load invoice data.');
        } finally {
            setLoading(false);
        }
    };

    // Memoize options for react-select to prevent re-renders
    const customerOptions = useMemo(() =>
        customers.map(c => ({
            value: c._id,
            label: `${c.firmName || c.name} ${c.gstNo ? `(${c.gstNo})` : ''}`
        })), [customers]);

    const itemOptions = useMemo(() =>
        items.map(i => ({
            value: i._id,
            label: `${i.name} (HSN: ${i.hsnCode})`,
            ...i // include full item object
        })), [items]);

    const summaryCalculations = useMemo(() => {
        if (!invoiceData || !customers.length) return { totalBeforeTax: 0, totalTax: 0, grandTotal: 0, balance: 0 };

        const customer = customers.find(c => c._id === invoiceData.customer);
        const isInterState = customer?.state?.toLowerCase() !== 'maharashtra';

        let totalBeforeTax = 0;
        let totalTax = 0;

        (invoiceData.items || []).forEach(item => {
            const price = Number(item.price || item.rate || 0);
            const qty = Number(item.quantity || 0);
            const taxSlab = Number(item.taxSlab || item.taxRate || 0);
            
            // For simplicity, assuming discount is applied at the end.
            // A more complex item-wise discount logic can be added if needed.
            const lineTotal = price * qty;
            totalBeforeTax += lineTotal;
            const taxInfo = calculateTax(lineTotal, taxSlab, isInterState);
            totalTax += taxInfo.total;
        });

        const grandTotal = totalBeforeTax - (invoiceData.discount || 0) + (invoiceData.shippingCharges || 0) + totalTax;
        const balance = grandTotal - (invoiceData.paidAmount || 0);

        return { totalBeforeTax, totalTax, grandTotal, balance };
    }, [invoiceData, customers]);

    const handleInputChange = (field, value) => {
        setInvoiceData({ ...invoiceData, [field]: value });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...invoiceData.items];
        if (field === 'itemId') {
            const selectedItem = value; // react-select passes the whole option object
            updatedItems[index] = {
                ...updatedItems[index],
                isCustom: false,
                itemId: selectedItem.value,
                item: selectedItem, // Keep full item for reference
                price: selectedItem?.rate ?? selectedItem?.price ?? 0,
                taxSlab: selectedItem?.taxSlab ?? 0,
                priceType: selectedItem?.priceType ?? 'Exclusive',
                name: selectedItem?.name ?? '',
                hsnCode: selectedItem?.hsnCode ?? ''
            };
        } else if (field === 'isCustom' && value === true) {
            // When switching to a custom item, clear catalog-specific fields
            updatedItems[index] = {
                ...updatedItems[index],
                isCustom: true,
                itemId: '',
                item: null,
            };
        } else {
            updatedItems[index][field] = value;
        }
        setInvoiceData({ ...invoiceData, items: updatedItems });
    };

    const handleAddItem = () => {
        const newItem = {
            id: Date.now() + Math.random(), // Unique identifier
            itemId: '',
            isCustom: false,
            quantity: 1,
            item: null,
            price: 0,
            taxSlab: 0,
            priceType: 'Exclusive',
            name: '',
            hsnCode: ''
        };
        setInvoiceData({ ...invoiceData, items: [...invoiceData.items, newItem] });
    };

    const handleRemoveItem = (index) => {
        const updatedItems = invoiceData.items.filter((_, i) => i !== index);
        setInvoiceData({ ...invoiceData, items: updatedItems });
    };

    const handleUpdateInvoice = async () => {
        setLoading(true);

        // Validate form before submitting (customer required unless POS quick-bill enabled)
        if (!isPOS && !invoiceData.customer) {
            toast.error('Please select a customer');
            setLoading(false);
            return;
        }

        if (invoiceData.items.length === 0) {
            toast.error('Please add at least one item');
            setLoading(false);
            return;
        }

        // Validate all items
        const invalidItems = invoiceData.items.filter(item => {
            const isCatalogItem = !item.isCustom && item.itemId;
            const isCustomItem = item.isCustom && item.name && item.hsnCode;
            const hasQuantity = item.quantity > 0;
            return !((isCatalogItem || isCustomItem) && hasQuantity);
        });

        if (invalidItems.length > 0) {
            toast.error('Please complete all item details. Each item must have a name, HSN, and a valid quantity.');
            setLoading(false);
            return;
        }

        try {
            toast.loading('Updating invoice...', { id: 'update-toast' });

            // Ensure items being sent to backend have the correct structure
            const itemsForBackend = invoiceData.items.map(({ item, itemId, isCustom, ...rest }) => ({
                ...rest,
                // Send item ID only for catalog items, otherwise send null/undefined
                item: isCustom ? null : itemId,
                // For custom items, ensure name and hsnCode are sent
                name: isCustom ? rest.name : item?.name,
                hsnCode: isCustom ? rest.hsnCode : item?.hsnCode,
                price: rest.price,
                taxSlab: rest.taxSlab,
                quantity: rest.quantity,
            }));

            const rawExp = invoiceData.exportInfo || {};
            const exportInfo = rawExp.isExport ? {
              isExport: true,
              exportType: rawExp.exportType || '', // 'SEZ' or 'EXPORT'
              withTax: !!rawExp.withTax,
              shippingBillNo: rawExp.shippingBillNo || '',
              shippingBillDate: rawExp.shippingBillDate || undefined,
              portCode: rawExp.portCode || '',
            } : { isExport: false };

            const dataToSend = { ...invoiceData, items: itemsForBackend, exportInfo, billingType: isPOS ? 'POS' : invoiceData.billingType };

            const response = await billingAPI.updateInvoice(id, dataToSend);
            toast.dismiss('update-toast');
            toast.success('Invoice updated successfully!');

                        // No immediate PDF generation. Provide quick link to on-demand download.
                        toast(
                            <div>
                                <p>Need the PDF?</p>
                                <button
                                    className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm"
                                    onClick={() => {
                                        const apiBase = getApiBaseUrl() || '';
                                        const prefix = apiBase ? apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') : (getAppBasePath() || '').replace(/\/$/, '');
                                        const url = `${prefix}/api/billing/public/pdf/${id}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    Download PDF
                                </button>
                            </div>,
                            { duration: 5000 }
                        );

                        // Delay navigation slightly to allow toast to be seen
                        setTimeout(() => navigate('/invoices'), 1000);
        } catch (error) {
            toast.dismiss('update-toast');
            toast.error('Failed to update invoice: ' + (error.response?.data?.message || error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const setExportInfoField = (field, value) => {
      setInvoiceData(prev => ({
        ...prev,
        exportInfo: {
          ...(prev.exportInfo || {}),
          [field]: value
        }
      }));
    };

    // If still loading or invoice data not yet available, show a loading state to avoid null access
    if (loading || !invoiceData) {
        return (
            <Layout>
                <div className="max-w-2xl mx-auto px-3 sm:px-0">
                    <div className="card-enhanced p-6 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading invoice details...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    // Render a form similar to Billing.jsx but for editing
    return (
        <Layout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Edit Invoice - {invoiceData.invoiceNumber}</h1>
                <div className="bg-white rounded-lg shadow p-6">
                    {/* Header with Invoice Details */}
                    <div className="flex flex-wrap justify-between mb-6">
                        <div className="w-full md:w-1/2 mb-4 md:mb-0">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500">Invoice Number</h4>
                                <p className="text-xl font-bold">{invoiceData.invoiceNumber}</p>

                                <div className="mt-2">
                                    <h4 className="text-sm font-medium text-gray-500">Date</h4>
                                    <p>{new Date(invoiceData.invoiceDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2">
                            <div className="bg-gray-50 p-4 rounded-lg h-full">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Edit Status</h4>
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                                    </svg>
                                    <p className="text-blue-700">
                                        Editing invoice. All changes are saved when you click "Save Changes".
                                    </p>
                                </div>

                                <div className="mt-4 flex justify-between items-center">
                                    <button
                                        onClick={() => navigate('/invoices')}
                                        className="text-gray-600 hover:text-gray-900 text-sm flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                        Back to Invoices
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Selection */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Customer</label>
                            <label className="flex items-center text-sm">
                                <input type="checkbox" className="mr-2" checked={isPOS} onChange={(e) => setIsPOS(e.target.checked)} />
                                POS / Quick Bill (no customer)
                            </label>
                        </div>
                        {!isPOS ? ( // Using react-select for a better UX
                            <Select
                                options={customerOptions}
                                value={customerOptions.find(opt => opt.value === invoiceData.customer)}
                                onChange={(selectedOption) => handleInputChange('customer', selectedOption.value)}
                                placeholder="Search and select a customer..."
                                className="react-select-container"
                                classNamePrefix="react-select"
                                isClearable
                            />
                        ) : (
                          <div className="p-3 bg-yellow-50 rounded">This invoice will be saved as POS/Walk-in (no customer required).</div>
                        )}
                    </div>

                    {/* Items Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-3 mb-2 text-xs font-bold text-gray-600 uppercase">
                        <div className="col-span-4">Item Details</div>
                        <div className="col-span-2">Stock / Qty</div>
                        <div className="col-span-4 grid grid-cols-3 gap-2"><div>Rate</div><div>Tax %</div><div>HSN</div></div>
                        <div className="col-span-1 text-right">Amount</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Items Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Items</h3>
                            <Button onClick={handleAddItem} size="sm">Add Item</Button>
                        </div>
                        <div className="space-y-4">
                            {(invoiceData.items || []).map((billItem, index) => (
                                <div key={billItem.id || `item-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border rounded-lg bg-gray-50/50">
                                    {/* Item Selection / Custom Item Input */}
                                    <div className="md:col-span-4">
                                        <label className="flex items-center text-xs text-gray-500 mb-1">
                                            <input type="checkbox" className="mr-2 h-4 w-4" checked={billItem.isCustom} onChange={(e) => handleItemChange(index, 'isCustom', e.target.checked)} />
                                            Custom Item
                                        </label>
                                        {billItem.isCustom ? (
                                            <InputField placeholder="Enter Item Name" value={billItem.name || ''} onChange={(e) => handleItemChange(index, 'name', e.target.value)} />
                                        ) : (
                                            <Select
                                                options={itemOptions}
                                                value={itemOptions.find(opt => opt.value === billItem.itemId)}
                                                onChange={(selectedOption) => handleItemChange(index, 'itemId', selectedOption)}
                                                placeholder="Search products..."
                                                className="react-select-container"
                                                classNamePrefix="react-select"
                                            />
                                        )}
                                    </div>

                                    {/* Stock and Quantity */}
                                    <div className="md:col-span-2 flex items-end gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500">Stock</label>
                                            <div className={`p-2 rounded text-center font-bold ${billItem.item?.stock > 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                                                {billItem.isCustom ? 'N/A' : (billItem.item?.stock ?? '-')}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <InputField label="Qty" type="number" value={billItem.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>

                                    {/* Rate, Tax, HSN */}
                                    <div className="md:col-span-4 grid grid-cols-3 gap-2">
                                        <div>
                                            <InputField label="Rate" type="number" value={billItem.price ?? billItem.rate ?? 0} onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div>
                                            <InputField label="Tax %" type="number" value={billItem.taxSlab ?? billItem.taxRate ?? 0} onChange={(e) => handleItemChange(index, 'taxSlab', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div>
                                            <InputField label="HSN" type="text" value={billItem.hsnCode || ''} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} disabled={!billItem.isCustom} />
                                        </div>
                                    </div>

                                    {/* Line Total */}
                                    <div className="md:col-span-1 text-right">
                                        <div className="text-sm text-gray-500">Amount</div>
                                        <div className="font-medium text-gray-900">{formatCurrency((() => {
                                            const qty = Number(billItem.quantity || 0);
                                            const price = Number(billItem.price ?? billItem.rate ?? 0);
                                            const tax = Number(billItem.taxSlab ?? billItem.taxRate ?? 0) || 0;
                                            const taxable = price * qty;
                                            const taxAmt = taxable * (tax / 100);
                                            return (taxable + taxAmt).toFixed(2);
                                        })())}</div>
                                    </div>

                                    {/* Remove Button */}
                                    <div className="md:col-span-1 flex items-end justify-end">
                                        <Button onClick={() => handleRemoveItem(index)} variant="danger" size="sm">Remove</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Discount, Shipping, etc. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <InputField
                            label="Discount (₹)"
                            type="number"
                            value={invoiceData.discount}
                            onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                        />
                        <InputField
                            label="Shipping Charges (₹)"
                            type="number"
                            value={invoiceData.shippingCharges}
                            onChange={(e) => handleInputChange('shippingCharges', parseFloat(e.target.value) || 0)}
                        />
                        <InputField
                            label="Paid Amount (₹)"
                            type="number"
                            value={invoiceData.paidAmount}
                            onChange={(e) => handleInputChange('paidAmount', parseFloat(e.target.value) || 0)}
                        />
                        <div>
                            <label>Payment Method</label>
                            <select
                                value={invoiceData.paymentMethod}
                                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
                    </div>

                    {/* Export / SEZ Section */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-base font-semibold">Export Details</div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!invoiceData.exportInfo?.isExport}
                            onChange={(e)=> setExportInfoField('isExport', e.target.checked)}
                          />
                          Mark as Export/SEZ
                        </label>
                      </div>
                      {invoiceData.exportInfo?.isExport && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-600">Type</label>
                            <select
                              className="w-full px-3 py-2 border rounded-lg"
                              value={invoiceData.exportInfo?.exportType || ''}
                              onChange={(e)=> setExportInfoField('exportType', e.target.value)}
                            >
                              <option value="">Select</option>
                              <option value="EXPORT">Overseas Export</option>
                              <option value="SEZ">SEZ Supply</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">With Tax?</label>
                            <select
                              className="w-full px-3 py-2 border rounded-lg"
                              value={invoiceData.exportInfo?.withTax ? 'yes':'no'}
                              onChange={(e)=> setExportInfoField('withTax', e.target.value==='yes')}
                            >
                              <option value="no">Without Tax (WOPAY)</option>
                              <option value="yes">With Tax (WPAY)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Port Code</label>
                            <input
                              className="w-full px-3 py-2 border rounded-lg"
                              value={invoiceData.exportInfo?.portCode || ''}
                              onChange={(e)=> setExportInfoField('portCode', e.target.value)}
                              placeholder="e.g., INMAA1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Shipping Bill No.</label>
                            <input
                              className="w-full px-3 py-2 border rounded-lg"
                              value={invoiceData.exportInfo?.shippingBillNo || ''}
                              onChange={(e)=> setExportInfoField('shippingBillNo', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Shipping Bill Date</label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border rounded-lg"
                              value={invoiceData.exportInfo?.shippingBillDate ? String(invoiceData.exportInfo.shippingBillDate).substring(0,10) : ''}
                              onChange={(e)=> setExportInfoField('shippingBillDate', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Summary Section */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-medium mb-4">Summary</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(summaryCalculations.totalBeforeTax)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span>- {formatCurrency(invoiceData.discount || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax Amount:</span>
                                <span>{formatCurrency(summaryCalculations.totalTax)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping Charges:</span>
                                <span>{formatCurrency(invoiceData.shippingCharges || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Grand Total:</span>
                                <span>{formatCurrency(summaryCalculations.grandTotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Paid Amount:</span>
                                <span className="text-green-600 font-semibold">{formatCurrency(invoiceData.paidAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span>Balance:</span>
                                <span>{formatCurrency(summary.balance)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between mt-6">
                        <Button
                            onClick={() => navigate('/invoices')}
                            variant="outline"
                            size="lg"
                        >
                            Cancel
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    const apiBase = getApiBaseUrl() || '';
                                    const prefix = apiBase ? apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') : (getAppBasePath() || '').replace(/\/$/, '');
                                    const url = `${prefix}/api/billing/public/pdf/${id}`;
                                    window.open(url, '_blank');
                                }}
                                variant="secondary"
                                size="lg"
                            >
                                Download PDF
                            </Button>
                            <Button
                                onClick={() => {
                                    const apiBase = getApiBaseUrl() || '';
                                    const prefix = apiBase ? apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '') : (getAppBasePath() || '').replace(/\/$/, '');
                                    const url = `${prefix}/api/billing/public/pdf/${id}?format=thermal`;
                                    window.open(url, '_blank');
                                }}
                                variant="secondary"
                                size="lg"
                            >
                                Print Thermal
                            </Button>
                            <Button
                                onClick={() => {
                                    const updatedData = {
                                        ...invoiceData,
                                        hasBeenEdited: true
                                    };
                                    setInvoiceData(updatedData);
                                    handleUpdateInvoice();
                                }}
                                variant="primary"
                                size="lg"
                                disabled={loading}
                                className="flex items-center"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default EditInvoice;
