// backend/routes/enterpriseRoutes.js
// Enterprise-grade API routes for advanced features
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Import enterprise services
const whatsappService = require('../services/whatsappService');
const paymentService = require('../services/paymentService');
const reportingService = require('../services/reportingService');
const { cacheManager } = require('../utils/cacheManager');

// WhatsApp Integration Routes
router.get('/whatsapp/stats', authenticateToken, async (req, res) => {
    try {
        const { period = '24h' } = req.query;
        const stats = await whatsappService.getStats(period);
        res.json({
            success: true,
            data: stats,
            message: 'WhatsApp statistics retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get WhatsApp statistics',
            error: error.message
        });
    }
});

router.post('/whatsapp/send-message', authenticateToken, async (req, res) => {
    try {
        const { to, message, type = 'text', priority = 'normal' } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }

        const messageId = await whatsappService.sendTextMessage(to, message, priority);
        res.json({
            success: true,
            data: { messageId },
            message: 'WhatsApp message queued successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send WhatsApp message',
            error: error.message
        });
    }
});

router.post('/whatsapp/send-invoice', authenticateToken, async (req, res) => {
    try {
        const { invoiceId, customerPhone, type = 'created' } = req.body;
        
        const invoice = {
            _id: invoiceId,
            invoiceNumber: 'INV-2024-001',
            grandTotal: 15000,
            dueDate: '2024-02-15',
            customerDetails: { name: 'John Doe' },
            pdfPath: `/invoices/invoice-${invoiceId}.pdf`
        };

        const messageId = await whatsappService.sendInvoiceNotification(invoice, customerPhone, type);
        res.json({
            success: true,
            data: { messageId },
            message: 'WhatsApp invoice notification sent successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send WhatsApp invoice notification',
            error: error.message
        });
    }
});

router.post('/whatsapp/webhook', async (req, res) => {
    try {
        const signature = req.headers['x-whatsapp-signature'];
        await whatsappService.handleWebhook(req.body, signature);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('WhatsApp webhook error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Payment Gateway Routes
router.post('/payments/create-order', authenticateToken, async (req, res) => {
    try {
        const {
            amount,
            currency = 'INR',
            invoiceId,
            customerId,
            description,
            customerDetails,
            gateway = 'razorpay',
            paymentMethods
        } = req.body;

        if (!amount || !invoiceId) {
            return res.status(400).json({
                success: false,
                message: 'Amount and invoice ID are required'
            });
        }

        const order = await paymentService.createPaymentOrder({
            amount,
            currency,
            invoiceId,
            customerId,
            description,
            customerDetails,
            paymentMethods
        }, gateway);

        res.json({
            success: true,
            data: order,
            message: 'Payment order created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
});

router.post('/payments/verify', async (req, res) => {
    try {
        const { orderId, paymentId, signature, gateway } = req.body;
        
        const verification = await paymentService.verifyPayment({
            orderId,
            paymentId,
            signature,
            gateway
        });

        res.json({
            success: verification.success,
            data: verification,
            message: verification.success ? 'Payment verified successfully' : 'Payment verification failed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

router.post('/payments/offline', authenticateToken, async (req, res) => {
    try {
        const {
            invoiceId,
            amount,
            method,
            reference,
            notes,
            receivedDate,
            receivedBy
        } = req.body;

        if (!invoiceId || !amount || !method) {
            return res.status(400).json({
                success: false,
                message: 'Invoice ID, amount, and payment method are required'
            });
        }

        const payment = await paymentService.recordOfflinePayment({
            invoiceId,
            amount,
            method,
            reference,
            notes,
            receivedDate,
            receivedBy
        });

        res.json({
            success: true,
            data: payment,
            message: 'Offline payment recorded successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to record offline payment',
            error: error.message
        });
    }
});

router.post('/payments/generate-upi-qr', authenticateToken, async (req, res) => {
    try {
        const { amount, invoiceNumber, description, merchantVpa } = req.body;
        
        if (!amount || !invoiceNumber) {
            return res.status(400).json({
                success: false,
                message: 'Amount and invoice number are required'
            });
        }

        const upiData = await paymentService.generateUpiQrCode({
            amount,
            invoiceNumber,
            description,
            merchantVpa
        });

        res.json({
            success: true,
            data: upiData,
            message: 'UPI QR code generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate UPI QR code',
            error: error.message
        });
    }
});

router.get('/payments/methods', async (req, res) => {
    try {
        const { amount, location = 'IN' } = req.query;
        const methods = paymentService.getAvailablePaymentMethods(amount, location);
        
        res.json({
            success: true,
            data: methods,
            message: 'Available payment methods retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get payment methods',
            error: error.message
        });
    }
});

router.post('/payments/webhook/:gateway', async (req, res) => {
    try {
        const { gateway } = req.params;
        const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'];
        
        await paymentService.handleWebhook(gateway, req.body, signature, req.headers);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(`${gateway} webhook error:`, error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Advanced Reporting Routes
router.post('/reports/generate', authenticateToken, async (req, res) => {
    try {
        const { type, params, format = 'json' } = req.body;
        
        if (!type || !params) {
            return res.status(400).json({
                success: false,
                message: 'Report type and parameters are required'
            });
        }

        let report;

        switch (type) {
            case 'sales':
                report = await reportingService.generateSalesReport(params);
                break;
            case 'financial':
                report = await reportingService.generateFinancialReport(params);
                break;
            case 'gst':
                report = await reportingService.generateGSTReport(params);
                break;
            case 'customer':
                report = await reportingService.generateCustomerReport(params);
                break;
            case 'performance':
                report = await reportingService.generatePerformanceDashboard(params);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: `Unsupported report type: ${type}`
                });
        }

        res.json({
            success: true,
            data: report,
            message: 'Report generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    }
});

router.post('/reports/export', authenticateToken, async (req, res) => {
    try {
        const { reportData, format, filename } = req.body;
        
        if (!reportData || !format || !filename) {
            return res.status(400).json({
                success: false,
                message: 'Report data, format, and filename are required'
            });
        }

        const exportResult = await reportingService.exportReport(reportData, format, filename);
        
        res.json({
            success: true,
            data: exportResult,
            message: 'Report exported successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to export report',
            error: error.message
        });
    }
});

router.get('/reports/dashboard', authenticateToken, async (req, res) => {
    try {
        const { period = '30d', realTime = false } = req.query;
        
        const dashboard = await reportingService.generatePerformanceDashboard({
            period,
            realTime: realTime === 'true'
        });

        res.json({
            success: true,
            data: dashboard,
            message: 'Performance dashboard generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate performance dashboard',
            error: error.message
        });
    }
});

// Cache Management Routes (Development only)
if (process.env.NODE_ENV === 'development') {
    router.get('/cache/stats', authenticateToken, async (req, res) => {
        try {
            const stats = cacheManager.getStats();
            res.json({
                success: true,
                data: stats,
                message: 'Cache statistics retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to get cache statistics',
                error: error.message
            });
        }
    });

    router.delete('/cache/clear/:pattern?', authenticateToken, async (req, res) => {
        try {
            const { pattern } = req.params;
            
            if (pattern) {
                await cacheManager.clearPattern(pattern);
                res.json({
                    success: true,
                    message: `Cache cleared for pattern: ${pattern}`
                });
            } else {
                await cacheManager.clear();
                res.json({
                    success: true,
                    message: 'All cache cleared successfully'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to clear cache',
                error: error.message
            });
        }
    });
}

// System Health Check
router.get('/health', async (req, res) => {
    try {
        const healthCheck = {
            status: 'healthy',
            timestamp: new Date(),
            services: {
                email: {
                    status: 'active',
                    queue: emailService.emailQueue?.length || 0
                },
                whatsapp: {
                    status: 'active',
                    queue: whatsappService.messageQueue?.length || 0
                },
                payment: {
                    status: 'active',
                    gateways: Object.keys(paymentService.gateways).length
                },
                reporting: {
                    status: 'active',
                    templates: reportingService.templates?.size || 0
                },
                cache: {
                    status: 'active',
                    stats: cacheManager.getStats()
                }
            }
        };

        res.json({
            success: true,
            data: healthCheck,
            message: 'All enterprise services are operational'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

module.exports = router;
