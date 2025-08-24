// backend/services/notificationService.js
// Real-time notification system with multiple channels
const EventEmitter = require('events');
const { cacheManager } = require('../utils/cacheManager');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.channels = ['email', 'whatsapp', 'sms', 'push', 'in_app'];
        this.templates = new Map();
        this.subscribers = new Map();
        this.notificationQueue = [];
        this.retryAttempts = 3;
        
        this.setupEventListeners();
        this.initializeTemplates();
        this.startNotificationProcessor();
        
        console.log('✅ Real-time Notification Service initialized');
    }

    // Initialize notification templates
    initializeTemplates() {
        const templates = {
            'invoice_created': {
                title: 'New Invoice Created',
                email: {
                    subject: 'New Invoice #{invoiceNumber} - {companyName}',
                    template: 'invoice-created'
                },
                whatsapp: {
                    template: 'invoice_created',
                    message: '📄 New invoice #{invoiceNumber} created for ₹{amount}. Due date: {dueDate}'
                },
                push: {
                    title: 'New Invoice',
                    body: 'Invoice #{invoiceNumber} has been created',
                    icon: 'invoice'
                },
                in_app: {
                    type: 'info',
                    title: 'Invoice Created',
                    message: 'Invoice #{invoiceNumber} has been generated successfully'
                }
            },
            'payment_received': {
                title: 'Payment Received',
                email: {
                    subject: 'Payment Confirmed - Invoice #{invoiceNumber}',
                    template: 'payment-received'
                },
                whatsapp: {
                    template: 'payment_received',
                    message: '✅ Payment of ₹{amount} received for invoice #{invoiceNumber}. Thank you!'
                },
                push: {
                    title: 'Payment Received',
                    body: 'Payment of ₹{amount} has been received',
                    icon: 'payment'
                },
                in_app: {
                    type: 'success',
                    title: 'Payment Confirmed',
                    message: 'Payment of ₹{amount} received for invoice #{invoiceNumber}'
                }
            },
            'invoice_overdue': {
                title: 'Invoice Overdue',
                email: {
                    subject: 'Overdue Notice - Invoice #{invoiceNumber}',
                    template: 'invoice-overdue'
                },
                whatsapp: {
                    template: 'payment_reminder',
                    message: '⚠️ Invoice #{invoiceNumber} is overdue. Amount: ₹{amount}. Please make payment urgently.'
                },
                push: {
                    title: 'Invoice Overdue',
                    body: 'Invoice #{invoiceNumber} is past due date',
                    icon: 'warning'
                },
                in_app: {
                    type: 'error',
                    title: 'Invoice Overdue',
                    message: 'Invoice #{invoiceNumber} has exceeded its due date'
                }
            },
            'low_stock_alert': {
                title: 'Low Stock Alert',
                email: {
                    subject: 'Low Stock Alert - {itemName}',
                    template: 'custom-notification'
                },
                whatsapp: {
                    message: '📦 Low stock alert: {itemName}. Current stock: {currentStock}. Please reorder soon.'
                },
                push: {
                    title: 'Low Stock Alert',
                    body: '{itemName} is running low in stock',
                    icon: 'inventory'
                },
                in_app: {
                    type: 'warning',
                    title: 'Stock Alert',
                    message: '{itemName} stock is below minimum threshold'
                }
            },
            'system_alert': {
                title: 'System Alert',
                email: {
                    subject: 'System Alert - {alertType}',
                    template: 'custom-notification'
                },
                whatsapp: {
                    message: '🔔 System Alert: {message}'
                },
                push: {
                    title: 'System Alert',
                    body: '{message}',
                    icon: 'system'
                },
                in_app: {
                    type: 'info',
                    title: 'System Notification',
                    message: '{message}'
                }
            }
        };

        for (const [key, template] of Object.entries(templates)) {
            this.templates.set(key, template);
        }

        console.log(`✅ ${this.templates.size} notification templates loaded`);
    }

    // Setup event listeners for automatic notifications
    setupEventListeners() {
        // Invoice events
        this.on('invoice.created', async (data) => {
            await this.sendMultiChannelNotification('invoice_created', {
                recipients: [data.customerEmail],
                channels: ['email', 'whatsapp', 'in_app'],
                data: data
            });
        });

        this.on('invoice.payment_received', async (data) => {
            await this.sendMultiChannelNotification('payment_received', {
                recipients: [data.customerEmail],
                channels: ['email', 'whatsapp', 'push', 'in_app'],
                data: data
            });
        });

        this.on('invoice.overdue', async (data) => {
            await this.sendMultiChannelNotification('invoice_overdue', {
                recipients: [data.customerEmail],
                channels: ['email', 'whatsapp', 'push'],
                data: data,
                priority: 'high'
            });
        });

        // System events
        this.on('system.low_stock', async (data) => {
            await this.sendMultiChannelNotification('low_stock_alert', {
                recipients: data.adminEmails,
                channels: ['email', 'in_app'],
                data: data
            });
        });

        this.on('system.alert', async (data) => {
            await this.sendMultiChannelNotification('system_alert', {
                recipients: data.adminEmails,
                channels: ['email', 'push', 'in_app'],
                data: data,
                priority: 'high'
            });
        });

        console.log('✅ Event listeners configured for automatic notifications');
    }

    // Send notification across multiple channels
    async sendMultiChannelNotification(templateKey, options) {
        const {
            recipients,
            channels = ['email'],
            data,
            priority = 'normal',
            customTemplate = null
        } = options;

        const template = customTemplate || this.templates.get(templateKey);
        if (!template) {
            throw new Error(`Notification template not found: ${templateKey}`);
        }

        const notification = {
            id: this.generateNotificationId(),
            templateKey,
            template,
            recipients: Array.isArray(recipients) ? recipients : [recipients],
            channels,
            data,
            priority,
            createdAt: new Date(),
            status: 'queued',
            attempts: 0,
            channelResults: {}
        };

        // Add to queue
        this.notificationQueue.push(notification);
        
        // Cache notification for tracking
        await cacheManager.set(`notification:${notification.id}`, notification, 86400);

        console.log(`🔔 Multi-channel notification queued: ${notification.id} (${templateKey})`);
        return notification.id;
    }

    // Process notification queue
    startNotificationProcessor() {
        setInterval(async () => {
            if (this.notificationQueue.length === 0) return;

            const notification = this.notificationQueue.shift();
            
            try {
                await this.processNotification(notification);
                console.log(`✅ Notification processed: ${notification.id}`);
            } catch (error) {
                console.error(`❌ Notification processing failed: ${notification.id}`, error);
                await this.handleNotificationFailure(notification, error);
            }
        }, 2000); // Process every 2 seconds
    }

    // Process individual notification
    async processNotification(notification) {
        const results = {};

        for (const channel of notification.channels) {
            try {
                const result = await this.sendToChannel(channel, notification);
                results[channel] = {
                    success: true,
                    result: result,
                    sentAt: new Date()
                };
            } catch (error) {
                results[channel] = {
                    success: false,
                    error: error.message,
                    failedAt: new Date()
                };
            }
        }

        notification.channelResults = results;
        notification.status = 'processed';
        notification.processedAt = new Date();

        // Update cache
        await cacheManager.set(`notification:${notification.id}`, notification, 86400);

        // Emit completion event
        this.emit('notification.processed', notification);
    }

    // Send to specific channel
    async sendToChannel(channel, notification) {
        const { template, recipients, data } = notification;
        
        switch (channel) {
            case 'email':
                return await this.sendEmailNotification(template, recipients, data);
            
            case 'whatsapp':
                return await this.sendWhatsAppNotification(template, recipients, data);
            
            case 'push':
                return await this.sendPushNotification(template, recipients, data);
            
            case 'in_app':
                return await this.sendInAppNotification(template, recipients, data);
            
            case 'sms':
                return await this.sendSMSNotification(template, recipients, data);
            
            default:
                throw new Error(`Unsupported notification channel: ${channel}`);
        }
    }

    // Email notification
    async sendEmailNotification(template, recipients, data) {
        if (!template.email) return null;

        const results = [];
        for (const recipient of recipients) {
            const emailId = await emailService.queueEmail({
                template: template.email.template || 'custom-notification',
                to: recipient,
                subject: this.interpolateTemplate(template.email.subject, data),
                data: {
                    ...data,
                    subject: this.interpolateTemplate(template.email.subject, data),
                    content: this.interpolateTemplate(template.title, data)
                }
            });
            results.push(emailId);
        }
        
        return results;
    }

    // WhatsApp notification
    async sendWhatsAppNotification(template, recipients, data) {
        if (!template.whatsapp) return null;

        const results = [];
        for (const recipient of recipients) {
            let messageId;
            
            if (template.whatsapp.template) {
                // Use WhatsApp template message
                const parameters = this.extractTemplateParameters(template.whatsapp.template, data);
                messageId = await whatsappService.sendTemplateMessage(
                    recipient,
                    template.whatsapp.template,
                    parameters
                );
            } else {
                // Use text message
                const message = this.interpolateTemplate(template.whatsapp.message, data);
                messageId = await whatsappService.sendTextMessage(recipient, message);
            }
            
            results.push(messageId);
        }
        
        return results;
    }

    // Push notification
    async sendPushNotification(template, recipients, data) {
        if (!template.push) return null;

        const payload = {
            title: this.interpolateTemplate(template.push.title, data),
            body: this.interpolateTemplate(template.push.body, data),
            icon: template.push.icon,
            data: data
        };

        // Here you would integrate with Firebase Cloud Messaging or similar
        console.log('📱 Push notification would be sent:', payload);
        
        return { payload, recipients };
    }

    // In-app notification
    async sendInAppNotification(template, recipients, data) {
        if (!template.in_app) return null;

        const notification = {
            type: template.in_app.type,
            title: this.interpolateTemplate(template.in_app.title, data),
            message: this.interpolateTemplate(template.in_app.message, data),
            data: data,
            createdAt: new Date(),
            read: false
        };

        // Store in-app notifications for each recipient
        for (const recipient of recipients) {
            const cacheKey = `in_app_notifications:${recipient}`;
            const existing = await cacheManager.get(cacheKey) || [];
            existing.unshift(notification);
            
            // Keep only last 50 notifications
            if (existing.length > 50) {
                existing.splice(50);
            }
            
            await cacheManager.set(cacheKey, existing, 86400 * 7); // 7 days
        }

        return notification;
    }

    // SMS notification (placeholder)
    async sendSMSNotification(template, recipients, data) {
        // SMS integration would go here
        console.log('📱 SMS notification would be sent to:', recipients);
        return { message: 'SMS service not configured', recipients };
    }

    // Subscription management
    async subscribe(userId, preferences) {
        const subscription = {
            userId,
            channels: preferences.channels || ['email', 'in_app'],
            types: preferences.types || ['invoice_created', 'payment_received'],
            frequency: preferences.frequency || 'immediate',
            createdAt: new Date(),
            active: true
        };

        this.subscribers.set(userId, subscription);
        await cacheManager.set(`subscription:${userId}`, subscription, 86400 * 30);

        return subscription;
    }

    async unsubscribe(userId, channel = null) {
        const subscription = this.subscribers.get(userId);
        if (!subscription) return false;

        if (channel) {
            // Remove specific channel
            subscription.channels = subscription.channels.filter(c => c !== channel);
        } else {
            // Complete unsubscribe
            subscription.active = false;
        }

        this.subscribers.set(userId, subscription);
        await cacheManager.set(`subscription:${userId}`, subscription, 86400 * 30);

        return true;
    }

    // Get in-app notifications for user
    async getInAppNotifications(userId, unreadOnly = false) {
        const cacheKey = `in_app_notifications:${userId}`;
        let notifications = await cacheManager.get(cacheKey) || [];

        if (unreadOnly) {
            notifications = notifications.filter(n => !n.read);
        }

        return notifications;
    }

    // Mark notifications as read
    async markAsRead(userId, notificationIds = null) {
        const cacheKey = `in_app_notifications:${userId}`;
        const notifications = await cacheManager.get(cacheKey) || [];

        if (notificationIds) {
            // Mark specific notifications as read
            notifications.forEach(n => {
                if (notificationIds.includes(n.id)) {
                    n.read = true;
                    n.readAt = new Date();
                }
            });
        } else {
            // Mark all as read
            notifications.forEach(n => {
                n.read = true;
                n.readAt = new Date();
            });
        }

        await cacheManager.set(cacheKey, notifications, 86400 * 7);
        return true;
    }

    // Utility methods
    interpolateTemplate(template, data) {
        if (!template || !data) return template;
        
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] || match;
        });
    }

    extractTemplateParameters(templateName, data) {
        // Map data to template parameters based on template
        const parameterMaps = {
            'invoice_created': [data.customerName, data.invoiceNumber, data.amount, data.dueDate],
            'payment_received': [data.customerName, data.amount, data.invoiceNumber],
            'payment_reminder': [data.customerName, data.invoiceNumber, data.amount, data.daysOverdue]
        };

        return parameterMaps[templateName] || [];
    }

    generateNotificationId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async handleNotificationFailure(notification, error) {
        notification.attempts++;
        notification.lastError = error.message;
        notification.lastAttempt = new Date();

        if (notification.attempts < this.retryAttempts) {
            // Re-queue for retry
            setTimeout(() => {
                this.notificationQueue.push(notification);
            }, Math.pow(2, notification.attempts) * 60000); // Exponential backoff
            
            console.log(`🔄 Notification retry queued: ${notification.id}`);
        } else {
            notification.status = 'failed';
            console.error(`❌ Notification failed permanently: ${notification.id}`);
        }

        await cacheManager.set(`notification:${notification.id}`, notification, 86400);
    }

    // Analytics
    async getNotificationStats(period = '24h') {
        // Would typically aggregate from database
        return {
            totalSent: 0,
            byChannel: {},
            byType: {},
            successRate: 100,
            failureReasons: {}
        };
    }

    // Bulk notification sender
    async sendBulkNotification(templateKey, recipients, data, channels = ['email']) {
        const notifications = recipients.map(recipient => ({
            recipients: [recipient],
            channels,
            data: { ...data, recipient }
        }));

        const results = [];
        for (const notification of notifications) {
            const id = await this.sendMultiChannelNotification(templateKey, notification);
            results.push(id);
        }

        return results;
    }
}

// Export singleton instance
module.exports = new NotificationService();
