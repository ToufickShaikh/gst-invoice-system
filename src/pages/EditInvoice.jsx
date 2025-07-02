import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { customersAPI } from '../api/customers';
import { itemsAPI } from '../api/items';
import { billingAPI } from '../api/billing';
import { calculateTax } from '../utils/taxCalculations';
import { formatCurrency } from '../utils/dateHelpers';

const EditInvoice = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [items, setItems] = useState([]);
    const [invoiceData, setInvoiceData] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [customersRes, itemsRes, invoiceRes] = await Promise.all([
                customersAPI.getAll(),
                itemsAPI.getAll(),
                billingAPI.getInvoiceById(id) // Assuming you have this API function
            ]);

            setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
            setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);

            // Set up the form with existing invoice data
            const fetchedInvoice = invoiceRes.data || invoiceRes;
            setInvoiceData({
                ...fetchedInvoice,
                customer: fetchedInvoice.customer._id, // Use just the ID
                items: fetchedInvoice.items.map(item => ({
                    ...item,
                    itemId: item.item._id, // Use itemId for the select field
                }))
            });

        } catch (error) {
            toast.error('Failed to fetch invoice data');
            navigate('/invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setInvoiceData({ ...invoiceData, [field]: value });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...invoiceData.items];
        if (field === 'itemId') {
            const selectedItem = items.find(i => i._id === value);
            updatedItems[index] = { ...updatedItems[index], itemId: value, item: selectedItem, price: selectedItem.price, taxSlab: selectedItem.taxSlab, name: selectedItem.name, hsnCode: selectedItem.hsnCode };
        } else {
            updatedItems[index][field] = value;
        }
        setInvoiceData({ ...invoiceData, items: updatedItems });
    };

    const handleAddItem = () => {
        const newItem = { itemId: '', quantity: 1, item: null, price: 0, taxSlab: 0, name: '', hsnCode: '' };
        setInvoiceData({ ...invoiceData, items: [...invoiceData.items, newItem] });
    };

    const handleRemoveItem = (index) => {
        const updatedItems = invoiceData.items.filter((_, i) => i !== index);
        setInvoiceData({ ...invoiceData, items: updatedItems });
    };

    const handleUpdateInvoice = async () => {
        setLoading(true);
        try {
            // Ensure items being sent to backend have the correct structure
            const itemsForBackend = invoiceData.items.map(({ item, itemId, ...rest }) => ({
                ...rest,
                item: itemId, // Send only the ID
            }));

            const dataToSend = { ...invoiceData, items: itemsForBackend };

            const response = await billingAPI.updateInvoice(id, dataToSend);
            toast.success('Invoice updated successfully!');

            if (response.pdfPath) {
                const pdfUrl = `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/${response.pdfPath}`;
                window.open(pdfUrl, '_blank');
            }

            navigate('/invoices');
        } catch (error) {
            toast.error('Failed to update invoice');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !invoiceData) {
        return <Layout><div>Loading...</div></Layout>;
    }

    // Render a form similar to Billing.jsx but for editing
    return (
        <Layout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Edit Invoice - {invoiceData.invoiceNumber}</h1>
                <div className="bg-white rounded-lg shadow p-6">
                    {/* Customer Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                        <select
                            value={invoiceData.customer}
                            onChange={(e) => handleInputChange('customer', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            {customers.map(c => (
                                <option key={c._id} value={c._id}>{c.firmName || c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Items Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Items</h3>
                            <Button onClick={handleAddItem} size="sm">Add Item</Button>
                        </div>
                        <div className="space-y-4">
                            {invoiceData.items.map((billItem, index) => (
                                <div key={index} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label>Item</label>
                                        <select
                                            value={billItem.itemId}
                                            onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">Select an item</option>
                                            {items.map(item => (
                                                <option key={item._id} value={item._id}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <InputField
                                            label="Quantity"
                                            type="number"
                                            value={billItem.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <Button onClick={() => handleRemoveItem(index)} variant="danger" size="sm">Remove</Button>
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

                    <div className="flex justify-end mt-6">
                        <Button onClick={handleUpdateInvoice} variant="primary" size="lg" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default EditInvoice;
