// backend/services/emailService.js
// Enterprise-grade email automation service surpassing ZohoBooks
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const { cacheManager } = require('../utils/cacheManager');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = new Map();
        this.emailQueue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.rateLimits = {
            perMinute: 30,
            perHour: 1000,
            perDay: 10000
        };
        this.sentCounts = {
            minute: 0,
            hour: 0,
            day: 0,
            lastReset: {
                minute: Date.now(),
                hour: Date.now(),
                day: Date.now()
            }
        };
        
        this.initTransporter();
        this.loadTemplates();
        this.startQueueProcessor();
        this.startMetricsReset();
    }

    // Initialize email transporter with fallback options
    initTransporter() {
        const emailConfig = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 5
        };

        this.transporter = nodemailer.createTransport(emailConfig);

        // Verify connection
        this.transporter.verify((error) => {
            if (error) {
                console.error('❌ Email service connection failed:', error);
            } else {
                console.log('✅ Email service connected successfully');
            }
        });
    }

    // Load and compile email templates
    async loadTemplates() {
        const templatesDir = path.join(__dirname, '../templates/email');
        
        const templateFiles = {
            'invoice-created': 'invoice-created.html',
            'invoice-reminder': 'invoice-reminder.html',
            'invoice-overdue': 'invoice-overdue.html',
            'payment-received': 'payment-received.html',
            'quote-sent': 'quote-sent.html',
            'welcome': 'welcome.html',
            'password-reset': 'password-reset.html',
            'monthly-summary': 'monthly-summary.html',
            'custom-notification': 'custom-notification.html'
        };

        for (const [key, filename] of Object.entries(templateFiles)) {
            try {
                const templatePath = path.join(templatesDir, filename);
                const templateContent = await fs.readFile(templatePath, 'utf8');
                this.templates.set(key, handlebars.compile(templateContent));
                console.log(`✅ Email template loaded: ${key}`);
            } catch (error) {
                console.warn(`⚠️ Failed to load email template: ${key}`, error.message);
                // Create a basic fallback template
                this.templates.set(key, handlebars.compile(`
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #2563eb;">{{subject}}</h2>
                                <div style="margin: 20px 0;">
                                    {{{content}}}
                                </div>
                                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                                    <p>This email was sent from GST Invoice System</p>
                                </div>
                            </div>
                        </body>
                    </html>
                `));
            }
        }
    }

    // Rate limiting check
    checkRateLimit() {
        const now = Date.now();
        
        // Reset counters if time has passed
        if (now - this.sentCounts.lastReset.minute > 60000) {
            this.sentCounts.minute = 0;
            this.sentCounts.lastReset.minute = now;
        }
        if (now - this.sentCounts.lastReset.hour > 3600000) {
            this.sentCounts.hour = 0;
            this.sentCounts.lastReset.hour = now;
        }
        if (now - this.sentCounts.lastReset.day > 86400000) {
            this.sentCounts.day = 0;
            this.sentCounts.lastReset.day = now;
        }

        return (
            this.sentCounts.minute < this.rateLimits.perMinute &&
            this.sentCounts.hour < this.rateLimits.perHour &&
            this.sentCounts.day < this.rateLimits.perDay
        );
    }

    // Queue email for sending
    queueEmail(emailData) {
        const emailItem = {
            id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...emailData,
            attempts: 0,
            queuedAt: new Date(),
            priority: emailData.priority || 'normal' // high, normal, low
        };

        // Insert based on priority
        if (emailItem.priority === 'high') {
            this.emailQueue.unshift(emailItem);
        } else {
            this.emailQueue.push(emailItem);
        }

        console.log(`📧 Email queued: ${emailItem.id} (${emailItem.template})`);
        return emailItem.id;
    }

    // Process email queue
    async startQueueProcessor() {
        setInterval(async () => {
            if (this.isProcessing || this.emailQueue.length === 0) return;
            if (!this.checkRateLimit()) {
                console.log('⏳ Email rate limit reached, waiting...');
                return;
            }

            this.isProcessing = true;
            const email = this.emailQueue.shift();

            try {
                await this.sendEmailNow(email);
                console.log(`✅ Email sent successfully: ${email.id}`);
                
                // Update counters
                this.sentCounts.minute++;
                this.sentCounts.hour++;
                this.sentCounts.day++;
                
            } catch (error) {
                email.attempts++;
                email.lastError = error.message;
                email.lastAttempt = new Date();

                if (email.attempts < this.retryAttempts) {
                    // Re-queue for retry with exponential backoff
                    setTimeout(() => {
                        this.emailQueue.push(email);
                    }, Math.pow(2, email.attempts) * 60000); // 2^attempts minutes
                    
                    console.log(`🔄 Email retry queued: ${email.id} (attempt ${email.attempts + 1})`);
                } else {
                    console.error(`❌ Email failed permanently: ${email.id}`, error);
                    // Store failed email for manual review
                    await this.logFailedEmail(email, error);
                }
            }

            this.isProcessing = false;
        }, 2000); // Check every 2 seconds
    }

    // Send email immediately (bypassing queue)
    async sendEmailNow(emailData) {
        const { template, to, subject, data, attachments } = emailData;

        if (!this.templates.has(template)) {
            throw new Error(`Email template not found: ${template}`);
        }

        const templateFunction = this.templates.get(template);
        const htmlContent = templateFunction({ ...data, subject });

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || 'GST Invoice System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject,
            html: htmlContent,
            attachments: attachments || []
        };

        const result = await this.transporter.sendMail(mailOptions);
        
        // Cache email for tracking
        await cacheManager.set(`email:${emailData.id}`, {
            ...emailData,
            sentAt: new Date(),
            messageId: result.messageId,
            status: 'sent'
        }, 86400); // 24 hours

        return result;
    }

    // Business-specific email methods
    async sendInvoiceEmail(invoice, customerEmail, type = 'created') {
        const templateMap = {
            'created': 'invoice-created',
            'reminder': 'invoice-reminder',
            'overdue': 'invoice-overdue'
        };

        const subjectMap = {
            'created': `Invoice ${invoice.invoiceNumber} - ${invoice.companyName}`,
            'reminder': `Payment Reminder - Invoice ${invoice.invoiceNumber}`,
            'overdue': `Overdue Notice - Invoice ${invoice.invoiceNumber}`
        };

        return this.queueEmail({
            template: templateMap[type],
            to: customerEmail,
            subject: subjectMap[type],
            data: {
                invoice,
                customerName: invoice.customerDetails?.name,
                dueDate: invoice.dueDate,
                amount: invoice.grandTotal,
                companyName: invoice.companyDetails?.name,
                paymentLink: `${process.env.FRONTEND_URL}/pay/${invoice._id}`
            },
            attachments: invoice.pdfPath ? [{
                filename: `Invoice-${invoice.invoiceNumber}.pdf`,
                path: invoice.pdfPath
            }] : [],
            priority: type === 'overdue' ? 'high' : 'normal'
        });
    }

    async sendPaymentConfirmation(payment, customerEmail) {
        return this.queueEmail({
            template: 'payment-received',
            to: customerEmail,
            subject: `Payment Received - Invoice ${payment.invoiceNumber}`,
            data: {
                payment,
                customerName: payment.customerDetails?.name,
                amount: payment.amount,
                method: payment.method,
                date: payment.paidAt
            },
            priority: 'high'
        });
    }

    async sendQuoteEmail(quote, customerEmail) {
        return this.queueEmail({
            template: 'quote-sent',
            to: customerEmail,
            subject: `Quote ${quote.quoteNumber} - ${quote.companyName}`,
            data: {
                quote,
                customerName: quote.customerDetails?.name,
                validUntil: quote.validUntil,
                amount: quote.grandTotal,
                acceptLink: `${process.env.FRONTEND_URL}/quote/accept/${quote._id}`
            },
            attachments: quote.pdfPath ? [{
                filename: `Quote-${quote.quoteNumber}.pdf`,
                path: quote.pdfPath
            }] : []
        });
    }

    async sendMonthlyReport(email, reportData) {
        return this.queueEmail({
            template: 'monthly-summary',
            to: email,
            subject: `Monthly Business Summary - ${reportData.month} ${reportData.year}`,
            data: reportData,
            priority: 'low'
        });
    }

    // Advanced features
    async scheduleRecurringEmails(invoiceId, customerEmail, schedule) {
        // This would integrate with a job scheduler like node-cron
        const schedules = {
            'weekly': '0 9 * * 1', // Every Monday at 9 AM
            'biweekly': '0 9 1,15 * *', // 1st and 15th at 9 AM
            'monthly': '0 9 1 * *' // 1st of month at 9 AM
        };

        // Store in database for cron job pickup
        const recurringEmail = {
            invoiceId,
            customerEmail,
            schedule: schedules[schedule],
            template: 'invoice-reminder',
            active: true,
            createdAt: new Date()
        };

        // This would be stored in a RecurringEmails collection
        console.log('📅 Recurring email scheduled:', recurringEmail);
        return recurringEmail;
    }

    // Email analytics and tracking
    async getEmailStats(period = '24h') {
        const cacheKey = `email:stats:${period}`;
        let stats = await cacheManager.get(cacheKey);

        if (!stats) {
            // Calculate stats from database/logs
            stats = {
                sent: this.sentCounts.day,
                queued: this.emailQueue.length,
                failed: 0,
                delivered: 0,
                opened: 0,
                clicked: 0,
                bounced: 0
            };

            await cacheManager.set(cacheKey, stats, 3600); // 1 hour cache
        }

        return stats;
    }

    // Utility methods
    async logFailedEmail(email, error) {
        const logEntry = {
            emailId: email.id,
            template: email.template,
            to: email.to,
            subject: email.subject,
            error: error.message,
            attempts: email.attempts,
            failedAt: new Date()
        };

        // This would typically be stored in a FailedEmails collection
        console.error('📧❌ Failed email logged:', logEntry);
    }

    startMetricsReset() {
        // Reset rate limit counters periodically
        setInterval(() => {
            const now = Date.now();
            if (now - this.sentCounts.lastReset.minute > 60000) {
                this.sentCounts.minute = 0;
                this.sentCounts.lastReset.minute = now;
            }
        }, 30000); // Check every 30 seconds
    }

    // Test email functionality
    async sendTestEmail(to) {
        return this.queueEmail({
            template: 'custom-notification',
            to,
            subject: '✅ Email Service Test - GST Invoice System',
            data: {
                content: `
                    <h3 style="color: #10b981;">Email Service is Working!</h3>
                    <p>This test email confirms that your email service is properly configured.</p>
                    <ul>
                        <li>✅ SMTP connection established</li>
                        <li>✅ Template system loaded</li>
                        <li>✅ Queue processor running</li>
                        <li>✅ Rate limiting active</li>
                    </ul>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                `
            },
            priority: 'high'
        });
    }
}

// Export singleton instance
module.exports = new EmailService();
