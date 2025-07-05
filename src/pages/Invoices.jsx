import React, { useEffect, useState } from 'react';
import { billingAPI } from '../api/billing';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal'; // Import Modal
import { formatCurrency } from '../utils/dateHelpers';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { toast } from 'react-hot-toast';

const Invoices = () => {
    const navigate = useNavigate(); // Initialize navigate
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('B2B');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrCodeImage, setQrCodeImage] = useState('');

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
            await billingAPI.deleteInvoice(id); // FIX: Was billingAPI.remove(id)
            setInvoices(invoices.filter(inv => inv._id !== id));
            toast.success('Invoice deleted successfully!');
        } catch (err) {
            toast.error('Failed to delete invoice.');
        } finally {
            setLoading(false);
        }
    };

    // Navigate to the edit page
    const handleEdit = (invoiceId) => {
        navigate(`/edit-invoice/${invoiceId}`);
    };

    // Handle reprinting the invoice
    const handleReprint = async (invoiceId) => {
        setLoading(true);
        try {
            const res = await billingAPI.reprintInvoice(invoiceId);
            if (res.pdfPath) {
                // Construct the full URL to the PDF
                const pdfUrl = `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}/${res.pdfPath}`;
                window.open(pdfUrl, '_blank');
                toast.success('Invoice reprinted successfully!');
            } else {
                toast.error(res.message || 'Could not find PDF to reprint.');
            }
        } catch (err) {
            toast.error('Failed to reprint invoice');
        } finally {
            setLoading(false);
        }
    };

    // Handle generating and showing the payment QR code
    const handlePay = async (invoice) => {
        const balance = (invoice.grandTotal || 0) - (invoice.paidAmount || 0);
        if (balance <= 0) {
            toast.error('This invoice is already paid in full.');
            return;
        }

        setLoading(true);
        try {
            const res = await billingAPI.generatePaymentQr(invoice._id);
            if (res.qrCodeImage) {
                setQrCodeImage(res.qrCodeImage);
                setIsQrModalOpen(true);
            } else {
                toast.error('Could not generate QR code.');
            }
        } catch (err) {
            toast.error('Failed to generate QR code.');
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
                                    <td className="border px-2 py-1 space-x-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleEdit(inv._id)}>Edit</Button>
                                        <Button size="sm" onClick={() => handleReprint(inv._id)}>Reprint</Button>
                                        {((inv.grandTotal || 0) - (inv.paidAmount || 0)) > 0 && (
                                            <Button size="sm" variant="success" onClick={() => handlePay(inv)}>Pay</Button>
                                        )}
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(inv._id)}>Delete</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QR Code Modal */}
            <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Scan to Pay">
                {qrCodeImage && (
                    <div className="flex flex-col items-center">
                        <img src={qrCodeImage} alt="UPI QR Code" />
                        <p className="mt-2 text-sm text-gray-600">Scan this code with any UPI app to pay the balance.</p>
                    </div>
                )}
            </Modal>
        </Layout>
    );
};

export default Invoices;
