// backend/services/paymentService.js
// Enterprise Payment Gateway Integration Service
const axios = require('axios');
const crypto = require('crypto');
const { cacheManager } = require('../utils/cacheManager');

class PaymentService {
    constructor() {
        this.gateways = {
            razorpay: {
                keyId: process.env.RAZORPAY_KEY_ID,
                keySecret: process.env.RAZORPAY_KEY_SECRET,
                webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
                baseURL: 'https://api.razorpay.com/v1'
            },
            stripe: {
                secretKey: process.env.STRIPE_SECRET_KEY,
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                baseURL: 'https://api.stripe.com/v1'
            },
            cashfree: {
                appId: process.env.CASHFREE_APP_ID,
                secretKey: process.env.CASHFREE_SECRET_KEY,
                baseURL: process.env.CASHFREE_ENV === 'production' 
                    ? 'https://api.cashfree.com/pg' 
                    : 'https://sandbox.cashfree.com/pg'
            },
            phonepe: {
                merchantId: process.env.PHONEPE_MERCHANT_ID,
                saltKey: process.env.PHONEPE_SALT_KEY,
                saltIndex: process.env.PHONEPE_SALT_INDEX,
                baseURL: process.env.PHONEPE_ENV === 'production'
                    ? 'https://api.phonepe.com/apis/hermes'
                    : 'https://api-preprod.phonepe.com/apis/pg-sandbox'
            }
        };

        this.paymentMethods = [
            { id: 'card', name: 'Credit/Debit Card', icon: '💳', enabled: true },
            { id: 'upi', name: 'UPI', icon: '📱', enabled: true },
            { id: 'netbanking', name: 'Net Banking', icon: '🏦', enabled: true },
            { id: 'wallet', name: 'Digital Wallet', icon: '💰', enabled: true },
            { id: 'emi', name: 'EMI', icon: '📊', enabled: true },
            { id: 'cash', name: 'Cash', icon: '💵', enabled: true },
            { id: 'cheque', name: 'Cheque', icon: '📝', enabled: true },
            { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏛️', enabled: true }
        ];

        this.transactionCache = new Map();
        this.webhookHandlers = new Map();
        this.setupWebhookHandlers();
        
        console.log('✅ Payment Service initialized with multiple gateways');
    }

    // Setup webhook handlers for different gateways
    setupWebhookHandlers() {
        // Only bind handlers that are actually implemented
        this.webhookHandlers.set('razorpay', this.handleRazorpayWebhook.bind(this));
        
        // TODO: Implement these webhook handlers when needed
        // this.webhookHandlers.set('stripe', this.handleStripeWebhook.bind(this));
        // this.webhookHandlers.set('cashfree', this.handleCashfreeWebhook.bind(this));
        // this.webhookHandlers.set('phonepe', this.handlePhonepeWebhook.bind(this));
    }

    // Create payment intent/order
    async createPaymentOrder(orderData, gateway = 'razorpay') {
        const {
            amount,
            currency = 'INR',
            invoiceId,
            customerId,
            description,
            customerDetails,
            paymentMethods = ['card', 'upi', 'netbanking', 'wallet']
        } = orderData;

        const orderId = this.generateOrderId();
        const order = {
            orderId,
            amount: Math.round(amount * 100), // Convert to smallest currency unit
            currency,
            invoiceId,
            customerId,
            description: description || `Payment for Invoice ${invoiceId}`,
            customerDetails,
            gateway,
            status: 'created',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            paymentMethods,
            attempts: []
        };

        try {
            let gatewayOrder;

            switch (gateway) {
                case 'razorpay':
                    gatewayOrder = await this.createRazorpayOrder(order);
                    break;
                case 'stripe':
                    gatewayOrder = await this.createStripePaymentIntent(order);
                    break;
                case 'cashfree':
                    gatewayOrder = await this.createCashfreeOrder(order);
                    break;
                case 'phonepe':
                    gatewayOrder = await this.createPhonepeOrder(order);
                    break;
                default:
                    throw new Error(`Unsupported payment gateway: ${gateway}`);
            }

            order.gatewayOrderId = gatewayOrder.id;
            order.gatewayData = gatewayOrder;
            order.paymentUrl = this.generatePaymentUrl(order);

            // Cache order data
            await cacheManager.set(`payment:${orderId}`, order, 86400);
            
            console.log(`💳 Payment order created: ${orderId} via ${gateway}`);
            return order;

        } catch (error) {
            console.error(`❌ Payment order creation failed: ${error.message}`);
            order.status = 'failed';
            order.error = error.message;
            throw error;
        }
    }

    // Razorpay integration
    async createRazorpayOrder(order) {
        const payload = {
            amount: order.amount,
            currency: order.currency,
            receipt: order.orderId,
            notes: {
                invoice_id: order.invoiceId,
                customer_id: order.customerId
            }
        };

        const response = await axios.post(
            `${this.gateways.razorpay.baseURL}/orders`,
            payload,
            {
                auth: {
                    username: this.gateways.razorpay.keyId,
                    password: this.gateways.razorpay.keySecret
                },
                headers: { 'Content-Type': 'application/json' }
            }
        );

        return response.data;
    }

    // Stripe integration
    async createStripePaymentIntent(order) {
        const stripe = require('stripe')(this.gateways.stripe.secretKey);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: order.amount,
            currency: order.currency.toLowerCase(),
            payment_method_types: ['card'],
            metadata: {
                invoice_id: order.invoiceId,
                customer_id: order.customerId,
                order_id: order.orderId
            }
        });

        return paymentIntent;
    }

    // Cashfree integration
    async createCashfreeOrder(order) {
        const headers = {
            'x-api-version': '2022-09-01',
            'x-client-id': this.gateways.cashfree.appId,
            'x-client-secret': this.gateways.cashfree.secretKey,
            'Content-Type': 'application/json'
        };

        const payload = {
            order_id: order.orderId,
            order_amount: order.amount / 100,
            order_currency: order.currency,
            customer_details: {
                customer_id: order.customerId,
                customer_name: order.customerDetails?.name,
                customer_email: order.customerDetails?.email,
                customer_phone: order.customerDetails?.phone
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment/success?order_id={order_id}`,
                notify_url: `${process.env.BACKEND_URL}/api/payments/webhook/cashfree`
            }
        };

        const response = await axios.post(
            `${this.gateways.cashfree.baseURL}/orders`,
            payload,
            { headers }
        );

        return response.data;
    }

    // PhonePe integration
    async createPhonepeOrder(order) {
        const merchantTransactionId = order.orderId;
        const merchantUserId = order.customerId || 'GUEST_USER';
        
        const payload = {
            merchantId: this.gateways.phonepe.merchantId,
            merchantTransactionId,
            merchantUserId,
            amount: order.amount,
            redirectUrl: `${process.env.FRONTEND_URL}/payment/success?order_id=${order.orderId}`,
            redirectMode: 'POST',
            callbackUrl: `${process.env.BACKEND_URL}/api/payments/webhook/phonepe`,
            mobileNumber: order.customerDetails?.phone,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const checksum = this.generatePhonepeChecksum(base64Payload);

        const response = await axios.post(
            `${this.gateways.phonepe.baseURL}/pay`,
            {
                request: base64Payload
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum
                }
            }
        );

        return {
            id: merchantTransactionId,
            payment_url: response.data.data.instrumentResponse.redirectInfo.url,
            ...response.data.data
        };
    }

    // Verify payment
    async verifyPayment(paymentData) {
        const { orderId, paymentId, signature, gateway } = paymentData;
        
        try {
            const cachedOrder = await cacheManager.get(`payment:${orderId}`);
            if (!cachedOrder) {
                throw new Error('Order not found');
            }

            let verificationResult;

            switch (gateway || cachedOrder.gateway) {
                case 'razorpay':
                    verificationResult = await this.verifyRazorpayPayment(cachedOrder, paymentId, signature);
                    break;
                case 'stripe':
                    verificationResult = await this.verifyStripePayment(cachedOrder, paymentId);
                    break;
                case 'cashfree':
                    verificationResult = await this.verifyCashfreePayment(cachedOrder, paymentId);
                    break;
                case 'phonepe':
                    verificationResult = await this.verifyPhonepePayment(cachedOrder, paymentId);
                    break;
                default:
                    throw new Error('Unsupported gateway for verification');
            }

            // Update order status
            cachedOrder.status = verificationResult.success ? 'completed' : 'failed';
            cachedOrder.paymentId = paymentId;
            cachedOrder.verificationData = verificationResult;
            cachedOrder.completedAt = new Date();

            await cacheManager.set(`payment:${orderId}`, cachedOrder, 86400);

            if (verificationResult.success) {
                // Trigger payment success actions
                await this.handlePaymentSuccess(cachedOrder, verificationResult);
            }

            return {
                success: verificationResult.success,
                orderId,
                paymentId,
                amount: cachedOrder.amount / 100,
                currency: cachedOrder.currency,
                status: cachedOrder.status,
                gateway: cachedOrder.gateway
            };

        } catch (error) {
            console.error('Payment verification failed:', error);
            throw error;
        }
    }

    // Gateway-specific verification methods
    async verifyRazorpayPayment(order, paymentId, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.gateways.razorpay.keySecret)
            .update(`${order.gatewayOrderId}|${paymentId}`)
            .digest('hex');

        if (expectedSignature !== signature) {
            return { success: false, error: 'Invalid signature' };
        }

        // Fetch payment details from Razorpay
        try {
            const response = await axios.get(
                `${this.gateways.razorpay.baseURL}/payments/${paymentId}`,
                {
                    auth: {
                        username: this.gateways.razorpay.keyId,
                        password: this.gateways.razorpay.keySecret
                    }
                }
            );

            const payment = response.data;
            return {
                success: payment.status === 'captured',
                paymentData: payment,
                method: payment.method,
                gateway: 'razorpay'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Generate UPI QR Code for direct payments
    async generateUpiQrCode(orderData) {
        const { amount, invoiceNumber, description, merchantVpa } = orderData;
        const vpa = merchantVpa || process.env.UPI_VPA || 'merchant@paytm';
        
        const upiString = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(process.env.COMPANY_NAME || 'GST Invoice System')}&am=${amount}&tn=${encodeURIComponent(description || `Payment for ${invoiceNumber}`)}&cu=INR`;

        // Generate QR code using a QR service or library
        const QRCode = require('qrcode');
        const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return {
            upiString,
            qrCodeDataUrl,
            vpa,
            amount,
            description: description || `Payment for ${invoiceNumber}`
        };
    }

    // Process offline payments (cash, cheque, bank transfer)
    async recordOfflinePayment(paymentData) {
        const {
            invoiceId,
            amount,
            method,
            reference,
            notes,
            receivedDate,
            receivedBy
        } = paymentData;

        const offlinePayment = {
            paymentId: this.generatePaymentId('offline'),
            invoiceId,
            amount,
            method,
            reference,
            notes,
            receivedDate: receivedDate || new Date(),
            receivedBy,
            status: 'completed',
            gateway: 'offline',
            createdAt: new Date()
        };

        // Cache the payment record
        await cacheManager.set(`payment:${offlinePayment.paymentId}`, offlinePayment, 86400);

        console.log(`💵 Offline payment recorded: ${offlinePayment.paymentId}`);
        
        // Trigger payment success workflow
        await this.handlePaymentSuccess(null, offlinePayment, true);

        return offlinePayment;
    }

    // Payment success handler
    async handlePaymentSuccess(order, paymentData, isOffline = false) {
        try {
            // Send confirmation email
            const emailService = require('./emailService');
            
            // Send WhatsApp confirmation
            const whatsappService = require('./whatsappService');
            
            // Update invoice payment status in database
            // This would typically update the Invoice model
            
            console.log(`✅ Payment success handled for ${isOffline ? 'offline' : 'online'} payment`);
            
        } catch (error) {
            console.error('Error handling payment success:', error);
        }
    }

    // Webhook handlers
    async handleWebhook(gateway, body, signature, headers) {
        const handler = this.webhookHandlers.get(gateway);
        if (!handler) {
            throw new Error(`No webhook handler for gateway: ${gateway}`);
        }

        return await handler(body, signature, headers);
    }

    async handleRazorpayWebhook(body, signature, headers) {
        const expectedSignature = crypto
            .createHmac('sha256', this.gateways.razorpay.webhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');

        if (expectedSignature !== signature) {
            throw new Error('Invalid webhook signature');
        }

        const event = body.event;
        const payment = body.payload.payment.entity;

        console.log(`🔔 Razorpay webhook: ${event}`);

        switch (event) {
            case 'payment.captured':
                await this.processWebhookPaymentSuccess(payment, 'razorpay');
                break;
            case 'payment.failed':
                await this.processWebhookPaymentFailure(payment, 'razorpay');
                break;
        }
    }

    // Utility methods
    generateOrderId() {
        return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generatePaymentId(prefix = 'PAY') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generatePaymentUrl(order) {
        return `${process.env.FRONTEND_URL}/payment/${order.orderId}`;
    }

    generatePhonepeChecksum(payload) {
        const string = payload + '/pg/v1/pay' + this.gateways.phonepe.saltKey;
        return crypto.createHash('sha256').update(string).digest('hex') + '###' + this.gateways.phonepe.saltIndex;
    }

    // Analytics and reporting
    async getPaymentStats(period = '30d') {
        const cacheKey = `payment:stats:${period}`;
        let stats = await cacheManager.get(cacheKey);

        if (!stats) {
            // Calculate from database/cache
            stats = {
                totalTransactions: 0,
                totalAmount: 0,
                successRate: 0,
                gatewayBreakdown: {},
                methodBreakdown: {},
                averageAmount: 0
            };

            await cacheManager.set(cacheKey, stats, 3600);
        }

        return stats;
    }

    // Get available payment methods for customer
    getAvailablePaymentMethods(amount, customerLocation = 'IN') {
        const methods = this.paymentMethods.filter(method => {
            if (method.id === 'emi' && amount < 300000) return false; // EMI only for amounts > 3000
            if (method.id === 'upi' && customerLocation !== 'IN') return false;
            return method.enabled;
        });

        return methods;
    }

    // Get gateway fees
    getGatewayFees(amount, gateway = 'razorpay', method = 'card') {
        const fees = {
            razorpay: {
                card: { percentage: 2.0, fixed: 0 },
                upi: { percentage: 0, fixed: 0 },
                netbanking: { percentage: 1.0, fixed: 0 },
                wallet: { percentage: 1.0, fixed: 0 }
            },
            stripe: {
                card: { percentage: 2.9, fixed: 30 }
            },
            cashfree: {
                card: { percentage: 1.95, fixed: 0 },
                upi: { percentage: 0, fixed: 0 }
            }
        };

        const feeStructure = fees[gateway]?.[method] || { percentage: 2.0, fixed: 0 };
        const calculatedFee = (amount * feeStructure.percentage / 100) + feeStructure.fixed;

        return {
            percentage: feeStructure.percentage,
            fixed: feeStructure.fixed,
            calculated: Math.round(calculatedFee * 100) / 100,
            total: amount + calculatedFee
        };
    }
}

// Export singleton instance
module.exports = new PaymentService();
