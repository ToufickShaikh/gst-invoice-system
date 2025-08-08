import React, { useEffect, useState } from 'react';
import { billingAPI } from '../api/billing';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Modal from '../components/Modal'; // Import Modal
import { formatCurrency } from '../utils/dateHelpers';
import { downloadInvoicePdf } from '../utils/downloadHelper';
import { tryMultipleDownloadMethods } from '../utils/alternativeDownload';
import { sendPaymentReminderViaWhatsApp } from '../utils/whatsappHelper';
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
            // For "ALL" tab, don't pass billingType filter
            const filterType = billingType === 'ALL' ? null : billingType;
            const res = await billingAPI.getInvoices(filterType);
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

    // Navigate to billing page for editing the invoice
    const handleEdit = (invoiceId) => {
        navigate(`/billing?edit=${invoiceId}`);
    };

    // Handle reprinting the invoice with automatic PDF download
    const handleReprint = async (invoiceId) => {
        // Confirm before reprinting
        if (!window.confirm('Are you sure you want to reprint this invoice?')) {
            return;
        }

        setLoading(true);
        try {
            console.log('🔄 Starting reprint process for invoice:', invoiceId);
            toast.loading('Generating invoice PDF...', { id: 'reprint-toast' });

            console.log('📡 Making API call to reprint invoice...');
            const res = await billingAPI.reprintInvoice(invoiceId);
            console.log('✅ API Response received:', res);

            if (res && res.pdfPath) {
                toast.dismiss('reprint-toast');
                toast.success('Invoice generated successfully!');
                console.log('📄 PDF Path received:', res.pdfPath);

                // Use the Nginx proxy URL for PDF serving
                const baseUrl = 'http://185.52.53.253/shaikh_carpets';
                console.log('🌐 Using base URL:', baseUrl);

                // Construct the PDF URL through Nginx proxy
                const normalizedPath = res.pdfPath.startsWith('/') ? res.pdfPath : `/${res.pdfPath}`;
                const pdfUrl = `${baseUrl}${normalizedPath}`;
                console.log('🔗 Final PDF URL:', pdfUrl);

                // Determine if it's a PDF or HTML file to set proper MIME type
                const isPdf = res.pdfPath.toLowerCase().endsWith('.pdf');
                const mimeType = isPdf ? 'application/pdf' : 'text/html';

                // Show different messages based on file type
                if (isPdf) {
                    toast.success('PDF invoice generated successfully! 📄', {
                        duration: 4000,
                        icon: '✅'
                    });
                } else {
                    toast.success('Invoice generated as HTML (PDF generation unavailable) 📄', {
                        duration: 5000,
                        icon: '⚠️'
                    });
                }

                // Extract filename
                let fileName = res.pdfPath.split('/').pop();
                if (!fileName) {
                    const extension = isPdf ? '.pdf' : '.html';
                    fileName = `invoice-${invoiceId}${extension}`;
                }
                console.log('📎 Filename:', fileName, 'Type:', mimeType);

                // Use direct window.open for simple and reliable download
                try {
                    console.log('🪟 Opening invoice in new tab...');
                    // Open the invoice in a new tab
                    const newWindow = window.open(pdfUrl, '_blank');

                    if (newWindow) {
                        console.log('✅ New window opened successfully');
                        const successMessage = isPdf ?
                            'PDF invoice opened in new tab! 📄' :
                            'HTML invoice opened in new tab! (Use browser\'s print to PDF for PDF version) 🖨️';

                        toast.success(successMessage, {
                            duration: 5000,
                            icon: '📥'
                        });
                    } else {
                        console.log('⚠️ Popup blocked, showing manual link');
                        throw new Error('Popup blocked');
                    }
                } catch (err) {
                    console.error('❌ Error opening PDF:', err);

                    // Fallback with manual link
                    toast.error(
                        <div>
                            <p>Could not open automatically. Click the link below to open manually:</p>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline"
                            >
                                Open {fileName}
                            </a>
                        </div>,
                        { duration: 10000 }
                    );
                }
            } else {
                console.error('❌ Invalid response from reprint API:', res);
                toast.dismiss('reprint-toast');
                toast.error(res?.message || 'Could not find PDF to reprint. Please try again.');
            }
        } catch (err) {
            console.error('❌ Reprint error:', err);
            toast.dismiss('reprint-toast');

            // Provide more specific error information
            if (err.response) {
                // Server responded with error status
                console.error('Server error response:', err.response.data);
                toast.error(`Server error: ${err.response.data?.message || err.response.statusText}`);
            } else if (err.request) {
                // Request was made but no response received
                console.error('No response received:', err.request);
                toast.error('No response from server. Please check your internet connection.');
            } else {
                // Something else happened
                console.error('Request setup error:', err.message);
                toast.error(`Error: ${err.message}`);
            }
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
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Invoices</h1>

                    {/* Quick Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="success"
                            size="sm"
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            }
                            onClick={() => {
                                toast.success('Opening invoice browser!', { duration: 1000 });
                                window.open('/invoices', '_blank');
                            }}
                        >
                            Open Invoice Browser
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4 mb-4">
                    <Button variant={tab === 'B2B' ? 'primary' : 'secondary'} onClick={() => setTab('B2B')}>B2B Invoices</Button>
                    <Button variant={tab === 'B2C' ? 'primary' : 'secondary'} onClick={() => setTab('B2C')}>B2C Invoices</Button>
                    <Button variant={tab === 'ALL' ? 'primary' : 'secondary'} onClick={() => setTab('ALL')}>All Invoices</Button>
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
                                <tr key={inv._id} className={!inv.customer ? 'bg-yellow-50' : (inv.hasBeenEdited ? 'bg-blue-50' : '')}>
                                    <td className="border px-2 py-1">{idx + 1}</td>
                                    <td className="border px-2 py-1">
                                        <div className="flex items-center">
                                            {inv.invoiceNumber}
                                            {inv.hasBeenEdited && (
                                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                    Edited
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="border px-2 py-1">
                                        {inv.customer ? (
                                            <div>
                                                <div>{inv.customer.firmName || inv.customer.name}</div>
                                                <small className="text-gray-500">({inv.customer.customerType})</small>
                                            </div>
                                        ) : (
                                            <span className="text-red-500 font-medium">No Customer</span>
                                        )}
                                    </td>
                                    <td className="border px-2 py-1">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ''}</td>
                                    <td className="border px-2 py-1">{formatCurrency(inv.grandTotal || inv.totalAmount)}</td>
                                    <td className="border px-2 py-1">{formatCurrency(inv.paidAmount)}</td>
                                    <td className="border px-2 py-1">{formatCurrency((inv.grandTotal || inv.totalAmount) - (inv.paidAmount || 0))}</td>
                                    <td className="border px-2 py-1 space-x-1">
                                        <div className="flex flex-wrap gap-1">
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                className="flex items-center"
                                                onClick={() => handleEdit(inv._id)}
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="flex items-center"
                                                onClick={() => handleReprint(inv._id)}
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                                Reprint
                                            </Button>
                                            {((inv.grandTotal || 0) - (inv.paidAmount || 0)) > 0 && (
                                                <>
                                                    <Button size="sm" variant="success" onClick={() => handlePay(inv)}>Pay</Button>
                                                    {/* WhatsApp Payment Reminder */}
                                                    {inv.customer?.contact && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                try {
                                                                    const result = sendPaymentReminderViaWhatsApp(
                                                                        inv.customer,
                                                                        {
                                                                            invoiceNumber: inv.invoiceNumber,
                                                                            grandTotal: inv.grandTotal || inv.totalAmount,
                                                                            paidAmount: inv.paidAmount || 0,
                                                                            balance: (inv.grandTotal || inv.totalAmount) - (inv.paidAmount || 0),
                                                                            invoiceDate: inv.invoiceDate
                                                                        }
                                                                    );

                                                                    if (result.success) {
                                                                        toast.success('WhatsApp reminder opened!', {
                                                                            duration: 3000,
                                                                            icon: '📱'
                                                                        });
                                                                    } else {
                                                                        toast.error(`Error: ${result.error}`);
                                                                    }
                                                                } catch (error) {
                                                                    toast.error('Failed to open WhatsApp reminder');
                                                                }
                                                            }}
                                                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                                        >
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                                                            </svg>
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            <Button size="sm" variant="danger" onClick={() => handleDelete(inv._id)}>Delete</Button>
                                        </div>
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
