import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { formatCurrency } from '../utils/dateHelpers'
import { downloadFile } from '../utils/downloadHelper'
import { tryMultipleDownloadMethods } from '../utils/alternativeDownload'
import { sendInvoiceViaWhatsApp } from '../utils/whatsappHelper'
import { toast } from 'react-hot-toast'

const InvoiceSuccess = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { invoiceId, pdfUrl, upiQr, balance, invoiceNumber, customerData, invoiceData, items } = location.state || {}
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)

  // Redirect if no invoice data
  if (!invoiceId) {
    navigate('/billing')
    return null
  }

  // Auto-download PDF when component mounts
  useEffect(() => {
    if (pdfUrl) {
      const fileName = invoiceNumber ? `invoice-${invoiceNumber}.pdf` : `invoice-${invoiceId}.pdf`;
      const isPdf = pdfUrl.toLowerCase().includes('.pdf');
      const mimeType = isPdf ? 'application/pdf' : 'text/html';

      // Use the improved download method
      tryMultipleDownloadMethods(pdfUrl, fileName, mimeType)
        .then(success => {
          if (success) {
            toast.success('Invoice downloaded automatically', { duration: 3000 });
          } else {
            toast.info('Auto-download failed. Use the download button below.', { duration: 5000 });
          }
        })
        .catch(error => {
          console.error('Auto-download error:', error);
          toast.info('Auto-download failed. Use the download button below.', { duration: 5000 });
        });
    }
  }, [pdfUrl, invoiceId, invoiceNumber]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="card-enhanced p-4 sm:p-6 lg:p-8 text-center">
          <div className="mb-4 sm:mb-6">
            <svg
              className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Invoice Generated Successfully!</h2>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Invoice ID: {invoiceId}</p>

          {/* PDF Download - Mobile optimized */}
          <div className="mb-6 sm:mb-8">
            <div className="action-buttons-mobile">
              <Button
                onClick={async () => {
                  const fileName = invoiceNumber ? `invoice-${invoiceNumber}.pdf` : `invoice-${invoiceId}.pdf`;
                  const isPdf = pdfUrl.toLowerCase().includes('.pdf');
                  const mimeType = isPdf ? 'application/pdf' : 'text/html';

                  try {
                    toast.success('Starting download...', { duration: 2000 });
                    const success = await tryMultipleDownloadMethods(pdfUrl, fileName, mimeType);

                    if (success) {
                      toast.success('Invoice download initiated!', {
                        duration: 4000,
                        icon: '📥'
                      });
                    } else {
                      // Fallback: open in new tab
                      window.open(pdfUrl, '_blank');
                      toast.error('Auto-download failed. Opening in new tab. Right-click and select "Save As" to download.', {
                        duration: 8000
                      });
                    }
                  } catch (error) {
                    console.error('Download error:', error);
                    // Final fallback
                    window.open(pdfUrl, '_blank');
                    toast.error('Download failed. Opening in new tab instead.', { duration: 6000 });
                  }
                }}
                variant="primary"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                Download PDF
              </Button>

              {/* WhatsApp Send Button */}
              {customerData?.contact && (
                <Button
                  onClick={async () => {
                    setSendingWhatsApp(true);
                    try {
                      const result = sendInvoiceViaWhatsApp(
                        customerData,
                        {
                          ...invoiceData,
                          invoiceNumber: invoiceNumber || invoiceId,
                          balance: balance || 0
                        },
                        items || [],
                        invoiceId // Pass invoiceId instead of pdfUrl
                      );

                      if (result.success) {
                        toast.success('WhatsApp opened with complete invoice details and direct PDF download link!', {
                          duration: 6000,
                          icon: '📱'
                        });
                        // Show additional helpful message
                        setTimeout(() => {
                          toast('Customer will receive full invoice summary and can tap the link for instant PDF download', {
                            duration: 8000,
                            icon: 'ℹ️'
                          });
                        }, 1000);
                      } else {
                        toast.error(`WhatsApp error: ${result.error}`);
                      }
                    } catch (error) {
                      console.error('WhatsApp send error:', error);
                      toast.error('Failed to open WhatsApp. Please check the phone number.');
                    } finally {
                      setSendingWhatsApp(false);
                    }
                  }}
                  variant="success"
                  size="lg"
                  disabled={sendingWhatsApp}
                  leftIcon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                  }
                >
                  {sendingWhatsApp ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
                </Button>
              )}
            </div>

            {/* Customer Contact Info */}
            {customerData?.contact && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center text-blue-800 mb-2">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">
                      Customer: {customerData.firmName || customerData.name}
                    </span>
                  </div>
                  <div className="text-blue-700 text-sm">
                    📱 {customerData.contact} | 📧 {customerData.email || 'No email'}
                  </div>

                  {/* Enhanced sharing instructions */}
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-800 text-sm">
                      <div className="font-medium mb-1">📱 WhatsApp Message includes:</div>
                      <ul className="text-left space-y-1">
                        <li>✅ Complete invoice summary</li>
                        <li>✅ Item-wise breakdown</li>
                        <li>✅ Payment details</li>
                        <li>✅ Clickable PDF download link</li>
                        <li>✅ Download instructions for customer</li>
                      </ul>
                    </div>
                  </div>

                  {/* Additional sharing options */}
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    <Button
                      onClick={() => {
                        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://gst-invoice-system-back.onrender.com';
                        const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${baseUrl}${pdfUrl}`;

                        if (navigator.share) {
                          navigator.share({
                            title: `Invoice ${invoiceNumber || invoiceId}`,
                            text: `Invoice for ${customerData.firmName || customerData.name} - ₹${invoiceData?.grandTotal || 0}`,
                            url: fullPdfUrl
                          }).then(() => {
                            toast.success('Shared successfully!');
                          }).catch(() => {
                            navigator.clipboard.writeText(fullPdfUrl);
                            toast.success('PDF link copied to clipboard!');
                          });
                        } else {
                          navigator.clipboard.writeText(fullPdfUrl);
                          toast.success('PDF link copied to clipboard!');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                      }
                    >
                      Copy PDF Link
                    </Button>

                    <Button
                      onClick={() => {
                        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://gst-invoice-system-back.onrender.com';
                        const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${baseUrl}${pdfUrl}`;

                        const emailSubject = encodeURIComponent(`Invoice ${invoiceNumber || invoiceId}`);
                        const emailBody = encodeURIComponent(`Dear ${customerData.firmName || customerData.name},

Please find your invoice here: ${fullPdfUrl}

Invoice Details:
- Invoice #: ${invoiceNumber || invoiceId}
- Amount: ₹${invoiceData?.grandTotal || 0}
- Date: ${new Date().toLocaleDateString('en-IN')}

Thank you for your business!

Best regards`);

                        window.open(`mailto:${customerData.email || ''}?subject=${emailSubject}&body=${emailBody}`);
                      }}
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                    >
                      Email Link
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* UPI QR Code */}
          {balance > 0 && upiQr && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">
                Balance Amount: {formatCurrency(balance)}
              </h3>
              <p className="text-gray-600 mb-4">Scan the QR code to pay via UPI</p>
              <div className="bg-gray-100 p-4 rounded-lg inline-block">
                <div className="w-48 h-48 bg-white border-2 border-gray-300 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">QR Code Placeholder</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">UPI: {upiQr}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center space-x-4 mt-8">
            <Button
              onClick={() => navigate('/billing')}
              variant="secondary"
            >
              Create New Invoice
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="secondary"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InvoiceSuccess