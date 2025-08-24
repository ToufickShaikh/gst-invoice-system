// backend/services/whatsappService.js
// Enterprise WhatsApp Business API integration
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const { cacheManager } = require('../utils/cacheManager');

class WhatsAppService {
    constructor() {
        this.baseURL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
        this.webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
        
        this.messageQueue = [];
        this.rateLimits = {
            perSecond: 20,
            perMinute: 1000,
            perDay: 100000
        };
        this.sentCounts = {
            second: 0,
            minute: 0,
            day: 0,
            lastReset: {
                second: Date.now(),
                minute: Date.now(),
                day: Date.now()
            }
        };

        this.messageTemplates = new Map();
        this.initializeTemplates();
        this.startQueueProcessor();
        this.startMetricsReset();
    }

    // Initialize message templates
    initializeTemplates() {
        // WhatsApp Business templates (must be approved by Meta)
        this.messageTemplates.set('invoice_created', {
            name: 'invoice_created',
            language: { code: 'en' },
            components: [{
                type: 'body',
                parameters: [
                    { type: 'text', text: '{{customerName}}' },
                    { type: 'text', text: '{{invoiceNumber}}' },
                    { type: 'text', text: '{{amount}}' },
                    { type: 'text', text: '{{dueDate}}' }
                ]
            }, {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: '{{invoiceId}}' }]
            }]
        });

        this.messageTemplates.set('payment_reminder', {
            name: 'payment_reminder',
            language: { code: 'en' },
            components: [{
                type: 'body',
                parameters: [
                    { type: 'text', text: '{{customerName}}' },
                    { type: 'text', text: '{{invoiceNumber}}' },
                    { type: 'text', text: '{{amount}}' },
                    { type: 'text', text: '{{daysOverdue}}' }
                ]
            }]
        });

        this.messageTemplates.set('payment_received', {
            name: 'payment_received',
            language: { code: 'en' },
            components: [{
                type: 'body',
                parameters: [
                    { type: 'text', text: '{{customerName}}' },
                    { type: 'text', text: '{{amount}}' },
                    { type: 'text', text: '{{invoiceNumber}}' }
                ]
            }]
        });

        console.log('✅ WhatsApp message templates initialized');
    }

    // Rate limiting check
    checkRateLimit() {
        const now = Date.now();
        
        // Reset counters
        if (now - this.sentCounts.lastReset.second > 1000) {
            this.sentCounts.second = 0;
            this.sentCounts.lastReset.second = now;
        }
        if (now - this.sentCounts.lastReset.minute > 60000) {
            this.sentCounts.minute = 0;
            this.sentCounts.lastReset.minute = now;
        }
        if (now - this.sentCounts.lastReset.day > 86400000) {
            this.sentCounts.day = 0;
            this.sentCounts.lastReset.day = now;
        }

        return (
            this.sentCounts.second < this.rateLimits.perSecond &&
            this.sentCounts.minute < this.rateLimits.perMinute &&
            this.sentCounts.day < this.rateLimits.perDay
        );
    }

    // Queue message for sending
    queueMessage(messageData) {
        const messageItem = {
            id: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...messageData,
            attempts: 0,
            queuedAt: new Date(),
            priority: messageData.priority || 'normal'
        };

        if (messageItem.priority === 'high') {
            this.messageQueue.unshift(messageItem);
        } else {
            this.messageQueue.push(messageItem);
        }

        console.log(`📱 WhatsApp message queued: ${messageItem.id}`);
        return messageItem.id;
    }

    // Process message queue
    async startQueueProcessor() {
        setInterval(async () => {
            if (this.messageQueue.length === 0) return;
            if (!this.checkRateLimit()) {
                console.log('⏳ WhatsApp rate limit reached, waiting...');
                return;
            }

            const message = this.messageQueue.shift();

            try {
                await this.sendMessageNow(message);
                console.log(`✅ WhatsApp message sent: ${message.id}`);
                
                // Update counters
                this.sentCounts.second++;
                this.sentCounts.minute++;
                this.sentCounts.day++;
                
            } catch (error) {
                message.attempts++;
                message.lastError = error.message;

                if (message.attempts < 3) {
                    setTimeout(() => {
                        this.messageQueue.push(message);
                    }, Math.pow(2, message.attempts) * 30000); // Exponential backoff
                    
                    console.log(`🔄 WhatsApp message retry: ${message.id}`);
                } else {
                    console.error(`❌ WhatsApp message failed: ${message.id}`, error);
                    await this.logFailedMessage(message, error);
                }
            }
        }, 1000); // Check every second
    }

    // Send template message
    async sendTemplateMessage(to, templateName, parameters, priority = 'normal') {
        if (!this.messageTemplates.has(templateName)) {
            throw new Error(`Template not found: ${templateName}`);
        }

        const template = this.messageTemplates.get(templateName);
        
        // Update template parameters
        const updatedTemplate = { ...template };
        if (parameters && updatedTemplate.components) {
            updatedTemplate.components = updatedTemplate.components.map(component => {
                if (component.type === 'body' && component.parameters) {
                    return {
                        ...component,
                        parameters: component.parameters.map((param, index) => ({
                            ...param,
                            text: parameters[index] || param.text
                        }))
                    };
                }
                return component;
            });
        }

        return this.queueMessage({
            to: this.formatPhoneNumber(to),
            type: 'template',
            template: updatedTemplate,
            priority
        });
    }

    // Send text message
    async sendTextMessage(to, text, priority = 'normal') {
        return this.queueMessage({
            to: this.formatPhoneNumber(to),
            type: 'text',
            text: { body: text },
            priority
        });
    }

    // Send document/invoice
    async sendDocument(to, documentPath, caption, priority = 'normal') {
        try {
            // Upload media first
            const mediaId = await this.uploadMedia(documentPath);
            
            return this.queueMessage({
                to: this.formatPhoneNumber(to),
                type: 'document',
                document: {
                    id: mediaId,
                    caption: caption || '',
                    filename: path.basename(documentPath)
                },
                priority
            });
        } catch (error) {
            console.error('Error sending document:', error);
            throw error;
        }
    }

    // Send image with optional caption
    async sendImage(to, imagePath, caption, priority = 'normal') {
        try {
            const mediaId = await this.uploadMedia(imagePath);
            
            return this.queueMessage({
                to: this.formatPhoneNumber(to),
                type: 'image',
                image: {
                    id: mediaId,
                    caption: caption || ''
                },
                priority
            });
        } catch (error) {
            console.error('Error sending image:', error);
            throw error;
        }
    }

    // Send interactive message with buttons
    async sendInteractiveMessage(to, bodyText, buttons, priority = 'normal') {
        const interactive = {
            type: 'button',
            body: { text: bodyText },
            action: {
                buttons: buttons.map((button, index) => ({
                    type: 'reply',
                    reply: {
                        id: button.id || `btn_${index}`,
                        title: button.title
                    }
                }))
            }
        };

        return this.queueMessage({
            to: this.formatPhoneNumber(to),
            type: 'interactive',
            interactive,
            priority
        });
    }

    // Send list message
    async sendListMessage(to, bodyText, buttonText, sections, priority = 'normal') {
        const interactive = {
            type: 'list',
            body: { text: bodyText },
            action: {
                button: buttonText,
                sections: sections
            }
        };

        return this.queueMessage({
            to: this.formatPhoneNumber(to),
            type: 'interactive',
            interactive,
            priority
        });
    }

    // Actually send message via API
    async sendMessageNow(messageData) {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: messageData.to,
            type: messageData.type,
            [messageData.type]: messageData[messageData.type] || messageData.template || messageData.interactive
        };

        const response = await axios.post(
            `${this.baseURL}/${this.phoneNumberId}/messages`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Cache message for tracking
        await cacheManager.set(`whatsapp:${messageData.id}`, {
            ...messageData,
            sentAt: new Date(),
            messageId: response.data.messages[0].id,
            status: 'sent'
        }, 86400);

        return response.data;
    }

    // Upload media to WhatsApp
    async uploadMedia(filePath) {
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        const mimeType = this.getMimeType(fileName);

        const formData = new FormData();
        formData.append('file', fileBuffer, fileName);
        formData.append('type', mimeType);
        formData.append('messaging_product', 'whatsapp');

        const response = await axios.post(
            `${this.baseURL}/${this.phoneNumberId}/media`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    ...formData.getHeaders()
                }
            }
        );

        return response.data.id;
    }

    // Business-specific methods
    async sendInvoiceNotification(invoice, customerPhone, type = 'created') {
        const templates = {
            'created': 'invoice_created',
            'reminder': 'payment_reminder',
            'overdue': 'payment_reminder'
        };

        const parameters = [
            invoice.customerDetails?.name || 'Valued Customer',
            invoice.invoiceNumber,
            `₹${invoice.grandTotal}`,
            type === 'created' ? invoice.dueDate : `${invoice.daysOverdue || 0} days`
        ];

        const messageId = await this.sendTemplateMessage(
            customerPhone,
            templates[type],
            parameters,
            type === 'overdue' ? 'high' : 'normal'
        );

        // Also send the invoice document if available
        if (invoice.pdfPath && type === 'created') {
            await this.sendDocument(
                customerPhone,
                invoice.pdfPath,
                `Invoice ${invoice.invoiceNumber} - Please find attached`,
                'normal'
            );
        }

        return messageId;
    }

    async sendPaymentConfirmation(payment, customerPhone) {
        const parameters = [
            payment.customerDetails?.name || 'Valued Customer',
            `₹${payment.amount}`,
            payment.invoiceNumber
        ];

        return await this.sendTemplateMessage(
            customerPhone,
            'payment_received',
            parameters,
            'high'
        );
    }

    async sendQuoteNotification(quote, customerPhone) {
        const message = `🎯 *New Quote Generated*

*Quote Number:* ${quote.quoteNumber}
*Amount:* ₹${quote.grandTotal}
*Valid Until:* ${quote.validUntil}

${quote.items?.length} item(s) quoted for your requirements.

*Next Steps:*
• Review the attached quote
• Contact us for any clarifications
• Accept to convert to order`;

        const messageId = await this.sendTextMessage(customerPhone, message);

        // Send quote document if available
        if (quote.pdfPath) {
            await this.sendDocument(
                customerPhone,
                quote.pdfPath,
                `Quote ${quote.quoteNumber} - Valid until ${quote.validUntil}`
            );
        }

        // Send interactive buttons
        await this.sendInteractiveMessage(
            customerPhone,
            'How would you like to proceed with this quote?',
            [
                { id: 'accept_quote', title: '✅ Accept Quote' },
                { id: 'request_changes', title: '📝 Request Changes' },
                { id: 'call_back', title: '📞 Call Me Back' }
            ]
        );

        return messageId;
    }

    async sendBulkPromotion(phoneNumbers, message, mediaPath = null) {
        const results = [];
        
        for (const phone of phoneNumbers) {
            try {
                let messageId;
                
                if (mediaPath) {
                    messageId = await this.sendImage(phone, mediaPath, message, 'low');
                } else {
                    messageId = await this.sendTextMessage(phone, message, 'low');
                }
                
                results.push({ phone, messageId, status: 'queued' });
            } catch (error) {
                results.push({ phone, error: error.message, status: 'failed' });
            }
        }

        return results;
    }

    // Webhook handlers
    async handleWebhook(body, signature) {
        // Verify webhook signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET || '')
            .update(JSON.stringify(body))
            .digest('hex');

        if (signature !== `sha256=${expectedSignature}`) {
            throw new Error('Invalid webhook signature');
        }

        // Process webhook events
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field === 'messages') {
                    await this.processMessageUpdate(change.value);
                }
            }
        }
    }

    async processMessageUpdate(value) {
        // Handle message status updates
        if (value.statuses) {
            for (const status of value.statuses) {
                await this.updateMessageStatus(status.id, status.status);
            }
        }

        // Handle incoming messages
        if (value.messages) {
            for (const message of value.messages) {
                await this.handleIncomingMessage(message);
            }
        }
    }

    async handleIncomingMessage(message) {
        const from = message.from;
        const messageType = message.type;
        
        console.log(`📱 Incoming WhatsApp message from ${from}: ${messageType}`);

        // Handle different message types
        switch (messageType) {
            case 'text':
                await this.handleTextMessage(from, message.text.body);
                break;
            case 'interactive':
                await this.handleInteractiveResponse(from, message.interactive);
                break;
            case 'button':
                await this.handleButtonResponse(from, message.button);
                break;
        }
    }

    async handleTextMessage(from, text) {
        const lowerText = text.toLowerCase();
        
        // Auto-responses for common queries
        if (lowerText.includes('balance') || lowerText.includes('due')) {
            // Fetch customer's outstanding balance
            await this.sendTextMessage(from, 'Please wait while I check your account balance...', 'high');
            // TODO: Integrate with customer service to fetch actual balance
        } else if (lowerText.includes('invoice') || lowerText.includes('bill')) {
            await this.sendTextMessage(from, 'I can help you with invoice queries. Please share your invoice number or customer ID.', 'high');
        } else if (lowerText.includes('payment')) {
            await this.sendInteractiveMessage(
                from,
                'How can I assist you with payments?',
                [
                    { id: 'payment_methods', title: 'Payment Methods' },
                    { id: 'payment_status', title: 'Payment Status' },
                    { id: 'payment_help', title: 'Payment Help' }
                ]
            );
        } else {
            // Generic response
            await this.sendTextMessage(
                from,
                '👋 Thank you for contacting us! Our team will respond to your query shortly. For immediate assistance, please call us at ' + process.env.COMPANY_PHONE,
                'high'
            );
        }
    }

    // Utility methods
    formatPhoneNumber(phone) {
        // Remove any non-digit characters and ensure country code
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            return cleaned;
        } else if (cleaned.length === 10) {
            return '91' + cleaned;
        }
        return cleaned;
    }

    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    async updateMessageStatus(messageId, status) {
        console.log(`📱 WhatsApp message ${messageId} status: ${status}`);
        
        // Update in cache
        const cached = await cacheManager.get(`whatsapp:message:${messageId}`);
        if (cached) {
            cached.status = status;
            cached.updatedAt = new Date();
            await cacheManager.set(`whatsapp:message:${messageId}`, cached, 86400);
        }
    }

    async logFailedMessage(message, error) {
        console.error('📱❌ Failed WhatsApp message:', {
            messageId: message.id,
            to: message.to,
            type: message.type,
            error: error.message,
            attempts: message.attempts
        });
    }

    startMetricsReset() {
        setInterval(() => {
            const now = Date.now();
            if (now - this.sentCounts.lastReset.second > 1000) {
                this.sentCounts.second = 0;
                this.sentCounts.lastReset.second = now;
            }
        }, 500);
    }

    // Analytics
    async getStats(period = '24h') {
        return {
            sent: this.sentCounts.day,
            queued: this.messageQueue.length,
            templates: this.messageTemplates.size,
            rateLimits: this.rateLimits
        };
    }
}

// Export singleton instance
module.exports = new WhatsAppService();
