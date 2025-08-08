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
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [whatsappButtonFocused, setWhatsappButtonFocused] = useState(false)
  const [showSendPrompt, setShowSendPrompt] = useState(false)
  const [loading, setLoading] = useState(true)

  // Debug logging
  useEffect(() => {
    console.log('InvoiceSuccess: location.state:', location.state);
    console.log('InvoiceSuccess: invoiceId:', invoiceId);
    console.log('InvoiceSuccess: pdfUrl:', pdfUrl);
    console.log('InvoiceSuccess: customerData:', customerData);
    console.log('InvoiceSuccess: invoiceNumber:', invoiceNumber);
    console.log('InvoiceSuccess: Full props extracted:', {
      invoiceId,
      pdfUrl,
      upiQr,
      balance,
      invoiceNumber,
      customerData,
      invoiceData,
      items
    });
    setLoading(false);
  }, [location.state, invoiceId, pdfUrl, customerData, invoiceNumber]);

  // Show loading state while checking data
  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-3 sm:px-0">
          <div className="card-enhanced p-4 sm:p-6 lg:p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Show error state if no invoice data
  if (!invoiceId && !invoiceNumber) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-3 sm:px-0">
          <div className="card-enhanced p-4 sm:p-6 lg:p-8 text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Invoice Data Missing</h2>
            <p className="text-gray-600 mb-4">
              Unable to load invoice details. This usually happens when navigating directly to this page.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <strong>Debug Info:</strong><br />
                Invoice ID: {invoiceId || 'Missing'}<br />
                Invoice Number: {invoiceNumber || 'Missing'}<br />
                PDF URL: {pdfUrl || 'Missing'}<br />
                Customer Data: {customerData ? 'Present' : 'Missing'}<br />
                Location State: {location.state ? 'Present' : 'Missing'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/billing')}
                variant="primary"
                size="lg"
              >
                Create New Invoice
              </Button>
              <Button
                onClick={() => navigate('/invoices')}
                variant="secondary"
                size="lg"
              >
                View All Invoices
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Auto-download and print PDF when component mounts
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
            setDownloadComplete(true);

            // Auto-print PDF after successful download
            setTimeout(() => {
              printPDF(pdfUrl, fileName);
            }, 1000);

            // After successful download, focus on the WhatsApp button if customer contact exists
            if (customerData?.contact) {
              setTimeout(() => {
                setWhatsappButtonFocused(true);
                setShowSendPrompt(true);
                // Show a prompt to send via WhatsApp
                toast.success(
                  'Send this invoice to your customer via WhatsApp with one click!',
                  { duration: 6000, icon: '📱' }
                );
              }, 2500);
            }
          } else {
            toast.info('Auto-download failed. Use the download button below.', { duration: 5000 });
            setDownloadComplete(true);
          }
        })
        .catch(error => {
          console.error('Auto-download error:', error);
          toast.info('Auto-download failed. Use the download button below.', { duration: 5000 });
          setDownloadComplete(true);
        });
    }
  }, [pdfUrl, invoiceId, invoiceNumber, customerData]);

  // Function to automatically print PDF
  const printPDF = async (pdfUrl, fileName) => {
    try {
      // Method 1: Try printing in hidden iframe (works best for PDFs)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      
      iframe.onload = () => {
        try {
          // Wait for PDF to load then print
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            toast.success('PDF sent to printer automatically', { 
              duration: 4000, 
              icon: '🖨️' 
            });
          }, 1500);
        } catch (printError) {
          console.warn('Print via iframe failed:', printError);
          // Fallback to opening in new window
          printPDFFallback(pdfUrl);
        }
      };

      iframe.onerror = () => {
        console.warn('PDF iframe loading failed');
        printPDFFallback(pdfUrl);
      };

      document.body.appendChild(iframe);
      
      // Clean up iframe after printing
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {
          console.warn('Iframe cleanup error:', e);
        }
      }, 10000);

    } catch (error) {
      console.error('Print setup error:', error);
      printPDFFallback(pdfUrl);
    }
  };

  // Fallback printing method
  const printPDFFallback = (pdfUrl) => {
    try {
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            toast.success('PDF opened for printing (print dialog should appear)', { 
              duration: 5000, 
              icon: '🖨️' 
            });
          }, 2000);
        };
      } else {
        toast.info('Please allow popups to enable automatic printing', { 
          duration: 6000, 
          icon: '⚠️' 
        });
      }
    } catch (error) {
      console.error('Fallback print error:', error);
      toast.error('Automatic printing failed. Please download and print manually.', { 
        duration: 5000 
      });
    }
  };

  const handleWhatsAppSend = async () => {
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
        invoiceId
      );

      if (result.success) {
        toast.success('WhatsApp opened with complete invoice details and direct PDF download link!', {
          duration: 6000,
          icon: '📱'
        });
        // Show additional helpful message
        setTimeout(() => {
          toast('Customer will receive full invoice summary with PDF download link', {
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
      setWhatsappButtonFocused(false);
      setShowSendPrompt(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 sm:px-0">
        <div className="card-enhanced p-4 sm:p-6 lg:p-8 text-center mobile-content-wrapper fade-in">
          <div className="mb-4 sm:mb-6 animate-pulse">
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

          <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Invoice Generated Successfully! 🎉</h2>
          <p className="text-gray-600 mb-2 text-sm sm:text-base">
            Invoice <span className="font-medium">#{invoiceNumber || invoiceId}</span>
          </p>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center text-blue-800 text-sm">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="font-medium">Auto-downloading and printing PDF...</span>
            </div>
          </div>

          {/* Show prompt banner if customer has phone number */}
          {customerData?.contact && showSendPrompt && (
            <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-5 animate-pulse rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800 font-medium">
                    Send this invoice to {customerData.name} via WhatsApp now!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Actions - Mobile optimized */}
          <div className="mb-6 sm:mb-8">
            {/* WhatsApp Send Button - Highlighted when customer info available */}
            {customerData?.contact && (
              <div className={`mb-6 ${whatsappButtonFocused ? 'animate-pulse' : ''}`}>
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl shadow-sm">
                  <h3 className="text-green-800 font-bold text-lg mb-2 flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                    Send Invoice to Customer
                  </h3>
                  <p className="text-green-700 mb-4 text-sm">
                    Send this invoice directly to {customerData.firmName || customerData.name} via WhatsApp including a direct PDF download link!
                  </p>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleWhatsAppSend}
                      variant="success"
                      size="lg"
                      disabled={sendingWhatsApp}
                      className="whatsapp-button-mobile w-full sm:w-auto py-4"
                      leftIcon={
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                        </svg>
                      }
                    >
                      {sendingWhatsApp ? 'Opening WhatsApp...' : 'Send Invoice via WhatsApp'}
                    </Button>
                  </div>

                  <div className="mt-3 text-sm text-green-700 border-t border-green-200 pt-3">
                    <p>✓ Includes complete invoice details</p>
                    <p>✓ Direct PDF download link for your customer</p>
                    <p>✓ Customer phone: {customerData.contact}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="action-buttons-mobile">
              {/* PDF Download Button */}
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
                className="mb-3"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                Download PDF Again
              </Button>

              {/* Print PDF Button */}
              <Button
                onClick={() => {
                  const fileName = invoiceNumber ? `invoice-${invoiceNumber}.pdf` : `invoice-${invoiceId}.pdf`;
                  toast.success('Sending to printer...', { duration: 2000 });
                  printPDF(pdfUrl, fileName);
                }}
                variant="secondary"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                }
              >
                Print Invoice
              </Button>
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
                  <div className="text-blue-700 text-sm flex flex-col sm:flex-row justify-center items-center gap-2">
                    <div className="flex items-center">
                      <span className="mr-1">📱</span> {customerData.contact}
                    </div>
                    <span className="hidden sm:inline">|</span>
                    <div className="flex items-center">
                      <span className="mr-1">📧</span> {customerData.email || 'No email'}
                    </div>
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

                  {/* Auto-send prompt */}
                  {downloadComplete && !sendingWhatsApp && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-pulse">
                      <p className="text-yellow-800 text-sm font-medium">
                        📤 Ready to send this invoice to the customer? Click the WhatsApp button above!
                      </p>
                    </div>
                  )}

                  {/* Additional sharing options */}
                  <div className="mt-3 flex flex-wrap gap-2 justify-center">
                    <Button
                      onClick={() => {
                        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://185.52.53.253/shaikh_carpets';
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
                        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://185.52.53.253/shaikh_carpets';
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
              <h3 className="text-lg font-semibold mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Balance Amount: {formatCurrency(balance)}
              </h3>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-yellow-300 shadow-md">
                  <p className="text-gray-700 mb-3 font-medium">Scan QR code to pay via UPI</p>
                  <div className="bg-white p-2 border-2 border-gray-200 rounded-lg">
                    <div className="w-48 h-48 bg-white flex items-center justify-center">
                      <p className="text-gray-500 text-sm">QR Code Placeholder</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-center mt-2">UPI: {upiQr}</p>
                </div>

                {customerData?.contact && (
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 max-w-sm">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                      </svg>
                      Send UPI Payment Request
                    </h4>
                    <p className="text-sm text-green-700 mb-3">
                      Include payment instructions when you share this invoice on WhatsApp!
                    </p>
                    <Button
                      onClick={handleWhatsAppSend}
                      variant="success"
                      size="md"
                      className="w-full"
                    >
                      Share Invoice with Payment Link
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium mb-4">What's Next?</h3>
            <div className="action-buttons-mobile">
              <Button
                onClick={() => navigate('/billing')}
                variant="secondary"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Create New Invoice
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="secondary"
                size="lg"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default InvoiceSuccess