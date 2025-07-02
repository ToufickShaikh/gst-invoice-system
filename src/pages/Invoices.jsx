import React, { useEffect, useState } from 'react';
import { billingAPI } from '../api/billing';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal';
import InputField from '../components/InputField';
import { formatCurrency } from '../utils/dateHelpers';

const Invoices = () => {

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('B2B');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editForm, setEditForm] = useState({ paidAmount: '', paymentMethod: '' });

    const fetchInvoices = async (billingType) => {
        setLoading(true);
        try {
            // Defensive: always use array
            const res = await billingAPI.getInvoices(billingType);
            if (Array.isArray(res)) {
                setInvoices(res);
            } else if (Array.isArray(res?.data)) {
                setInvoices(res.data);
            } else {
                setInvoices([]);
            }
        } catch (e) {
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices(tab);
    }, [tab]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        setLoading(true);
        try {
            await billingAPI.remove(id);
            setInvoices(invoices.filter(inv => inv._id !== id));
        } finally {
            setLoading(false);
        }
    };

    // Open edit modal and prefill form
    const handleEdit = (invoice) => {
        setEditingInvoice(invoice);
        setEditForm({
            paidAmount: invoice.paidAmount || '',
            paymentMethod: invoice.paymentMethod || ''
        });
        setIsEditModalOpen(true);
    };

    // Handle edit form change
    const handleEditFormChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    // Submit edit
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingInvoice) return;
        setLoading(true);
        try {
            const updated = await billingAPI.updateInvoice(editingInvoice._id, {
                paidAmount: Number(editForm.paidAmount),
                paymentMethod: editForm.paymentMethod
            });
            setInvoices(invoices.map(inv => inv._id === updated._id ? updated : inv));
            setIsEditModalOpen(false);
        } catch (err) {
            alert('Failed to update invoice');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Invoices</h1>
                <div className="flex gap-4 mb-4">
                    <Button variant={tab === 'B2B' ? 'primary' : 'secondary'} onClick={() => setTab('B2B')}>B2B Invoices</Button>
                    <Button variant={tab === 'B2C' ? 'primary' : 'secondary'} onClick={() => setTab('B2C')}>B2C Invoices</Button>
                </div>
                {loading && <div>Loading...</div>}
                <div className="overflow-x-auto">
                    <table className="min-w-full border">
                        <thead>
                            <tr>
                                <th className="border px-2 py-1">#</th>
                                <th className="border px-2 py-1">Invoice No</th>
                                <th className="border px-2 py-1">Customer</th>
                                <th className="border px-2 py-1">Date</th>
                                <th className="border px-2 py-1">Total</th>
                                <th className="border px-2 py-1">Paid</th>
                                <th className="border px-2 py-1">Balance</th>
                                <th className="border px-2 py-1">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv, idx) => (
                                <tr key={inv._id}>
                                    <td className="border px-2 py-1">{idx + 1}</td>
                                    <td className="border px-2 py-1">{inv.invoiceNumber}</td>
                                    <td className="border px-2 py-1">{inv.customer?.firmName || inv.customer?.name || inv.customer}</td>
                                    <td className="border px-2 py-1">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ''}</td>
                                    <td className="border px-2 py-1">{formatCurrency(inv.grandTotal || inv.totalAmount)}</td>
                                    <td className="border px-2 py-1">{formatCurrency(inv.paidAmount)}</td>
                                    <td className="border px-2 py-1">{formatCurrency((inv.grandTotal || inv.totalAmount) - (inv.paidAmount || 0))}</td>
                                    <td className="border px-2 py-1">
                                        <Button size="sm" onClick={() => alert(JSON.stringify(inv, null, 2))}>View</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleEdit(inv)}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(inv._id)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Edit Invoice Modal */}
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Invoice">
                    <form onSubmit={handleEditSubmit}>
                        <InputField
                            label="Paid Amount"
                            type="number"
                            name="paidAmount"
                            value={editForm.paidAmount}
                            onChange={handleEditFormChange}
                            min="0"
                        />
                        <InputField
                            label="Payment Method"
                            name="paymentMethod"
                            value={editForm.paymentMethod}
                            onChange={handleEditFormChange}
                        />
                        <div className="flex justify-end space-x-2 mt-4">
                            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </Layout>
    );
};

export default Invoices;
