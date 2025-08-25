const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const { generateUpiQr } = require('./upiHelper');
const { extractStateCode, COMPANY_STATE_CODE } = require('./taxHelpers');
const company = require('../config/company');

const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

async function generateInvoicePDF(invoiceData, fileName) {
    console.log(`[PDF] Starting PDF generation for invoice: ${invoiceData && invoiceData.invoiceNumber}`);
    let browser = null;
    try {
        const templatePath = path.resolve(__dirname, '../templates/invoiceTemplate-new.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        html = await replacePlaceholders(html, invoiceData);

        const outputDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(outputDir, { recursive: true });
        const safeNumber = (invoiceData && invoiceData.invoiceNumber) || `INV-${Date.now()}`;
        const pdfFileName = fileName && fileName.toString().trim().length > 0 ? fileName : `invoice-${safeNumber}.pdf`;
        const pdfPath = path.join(outputDir, pdfFileName);

        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });

        console.log(`[PDF] PDF generated successfully: ${pdfPath}`);
        return `/invoices/${path.basename(pdfPath)}`;
    } catch (error) {
        console.error('[PDF] generateInvoicePDF failed:', error && error.stack ? error.stack : error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

async function generateThermalPDF(invoiceData, fileName) {
    console.log(`[PDF] Starting thermal PDF generation for invoice: ${invoiceData && invoiceData.invoiceNumber}`);
    let browser = null;
    try {
        const templatePath = path.resolve(__dirname, '../templates/thermal-2in5.html');
        let html = await fs.readFile(templatePath, 'utf-8');
        html = await replacePlaceholders(html, invoiceData);

        const outputDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(outputDir, { recursive: true });
        const pdfFileName = fileName && fileName.toString().trim().length > 0 ? fileName : `invoice-thermal-${(invoiceData && invoiceData.invoiceNumber) || Date.now()}.pdf`;
        const pdfPath = path.join(outputDir, pdfFileName);

        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        try {
            await page.pdf({ path: pdfPath, width: '64mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
            console.log(`[PDF] Thermal PDF generated successfully: ${pdfPath}`);
            return `/invoices/${path.basename(pdfPath)}`;
        } catch (pdfErr) {
            console.error('[PDF] Thermal PDF page.pdf() failed:', pdfErr && pdfErr.stack ? pdfErr.stack : pdfErr);
            try {
                const debugDir = path.resolve(__dirname, '../invoices/debug-html');
                await fs.mkdir(debugDir, { recursive: true });
                const debugFile = path.join(debugDir, `thermal-html-${(invoiceData && (invoiceData._id || invoiceData.invoiceNumber)) || Date.now()}.html`);
                await fs.writeFile(debugFile, html, 'utf-8');
                console.log('[PDF] Wrote thermal HTML to debug file:', debugFile);
            } catch (writeErr) {
                console.error('[PDF] Failed to write thermal HTML debug file:', writeErr && writeErr.stack ? writeErr.stack : writeErr);
            }
            // Fallback to A4
            try {
                if (browser) await browser.close();
                const fallbackPath = await generateInvoicePDF(invoiceData, fileName && fileName.toString().trim().length > 0 ? fileName : undefined);
                console.log('[PDF] Fallback A4 PDF generated:', fallbackPath);
                return fallbackPath;
            } catch (fallbackErr) {
                console.error('[PDF] Fallback A4 PDF generation also failed:', fallbackErr && fallbackErr.stack ? fallbackErr.stack : fallbackErr);
                throw fallbackErr;
            }
        }
    } catch (error) {
        console.error('[PDF] generateThermalPDF failed:', error && error.stack ? error.stack : error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

async function replacePlaceholders(html, invoiceData) {
    try {
        const id = invoiceData && (invoiceData._id || invoiceData.id) ? (invoiceData._id || invoiceData.id) : 'N/A';
        const invNum = invoiceData && (invoiceData.invoiceNumber || invoiceData._id) ? (invoiceData.invoiceNumber || invoiceData._id) : 'N/A';
        const hasCustomer = invoiceData && typeof invoiceData.customer === 'object' && Object.keys(invoiceData.customer || {}).length > 0;
        const itemsLen = invoiceData && Array.isArray(invoiceData.items) ? invoiceData.items.length : 0;
        console.log(`[PDF] replacePlaceholders called for invoice id=${id}, invoiceNumber=${invNum}, hasCustomer=${hasCustomer}, items=${itemsLen}`);
    } catch (dbgErr) {
        console.warn('[PDF] replacePlaceholders debug log failed:', dbgErr);
    }

    // Company
    html = html.replace(/{{companyName}}/g, escapeHtml(company.name));
    html = html.replace(/{{companyAddress}}/g, escapeHtml(company.address));
    html = html.replace(/{{companyPhone}}/g, escapeHtml(company.phone));
    html = html.replace(/{{companyEmail}}/g, escapeHtml(company.email));
    html = html.replace(/{{companyGSTIN}}/g, escapeHtml(company.gstin));
    html = html.replace(/{{companyState}}/g, escapeHtml(company.state));
    html = html.replace(/{{companyLogo}}/g, company.logoUrl ? escapeHtml(company.logoUrl) : EMPTY_PIXEL);

    // Customer
    const customer = invoiceData && typeof invoiceData.customer === 'object' ? invoiceData.customer : (invoiceData && invoiceData._doc && invoiceData._doc.customer ? invoiceData._doc.customer : {});
    const customerName = customer && (customer.firmName || customer.name) ? (customer.firmName || customer.name) : '';
    const customerAddress = customer && (customer.firmAddress || customer.billingAddress) ? (customer.firmAddress || customer.billingAddress) : '';
    const customerPhone = customer && (customer.contact || customer.phone) ? (customer.contact || customer.phone) : '';
    const customerEmail = customer && customer.email ? customer.email : '';
    const customerGSTIN = customer && (customer.gstNo || customer.gstin) ? (customer.gstNo || customer.gstin) : '';
    const customerState = customer && customer.state ? customer.state : '33-Tamil Nadu';

    html = html.replace(/{{customerName}}/g, escapeHtml(customerName));
    html = html.replace(/{{customerAddress}}/g, escapeHtml(customerAddress));
    html = html.replace(/{{customerPhone}}/g, escapeHtml(customerPhone));
    html = html.replace(/{{customerEmail}}/g, escapeHtml(customerEmail));
    html = html.replace(/{{customerGSTIN}}/g, escapeHtml(customerGSTIN));
    html = html.replace(/{{customerState}}/g, escapeHtml(customerState));

    // Invoice meta
    const invoiceNumber = invoiceData && (invoiceData.invoiceNumber || (invoiceData._id ? String(invoiceData._id) : 'N/A')) || 'N/A';
    const invoiceDate = invoiceData && invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const dueDate = invoiceData && invoiceData.dueDate ? new Date(invoiceData.dueDate).toLocaleDateString('en-GB') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
    const placeOfSupply = customerState;

    html = html.replace(/{{invoiceNumber}}/g, escapeHtml(String(invoiceNumber)));
    html = html.replace(/{{invoiceDate}}/g, escapeHtml(invoiceDate));
    html = html.replace(/{{dueDate}}/g, escapeHtml(dueDate));
    html = html.replace(/{{placeOfSupply}}/g, escapeHtml(placeOfSupply));

    const customerStateCode = extractStateCode(customerState);
    const isInterState = customerStateCode && customerStateCode !== COMPANY_STATE_CODE;
    const paymentStatus = invoiceData && invoiceData.paymentStatus ? invoiceData.paymentStatus : ((Number(invoiceData && invoiceData.balance) || 0) <= 0 ? 'Paid' : (Number(invoiceData && invoiceData.paidAmount || 0) > 0 ? 'Partial' : 'Pending'));
    html = html.replace(/{{paymentStatus}}/g, escapeHtml(paymentStatus));
    html = html.replace(/{{supplyType}}/g, isInterState ? 'Interstate' : 'Intrastate');

    // Items and tax summary
    let totalQuantity = 0;
    let totalGST = 0;
    let totalDiscount = 0;
    let itemsHtml = '';
    const taxSummary = {};
    const items = invoiceData && Array.isArray(invoiceData.items) ? invoiceData.items : [];

    if (!items.length) {
        itemsHtml = `<tr><td colspan="8" style="text-align:center;">No items</td></tr>`;
    }

    for (let index = 0; index < items.length; index++) {
        const item = items[index] || {};
        const src = item && item.item && typeof item.item === 'object' ? item.item : item || {};
        const itemName = item && (item.name || src.name) ? (item.name || src.name) : '';
        const hsnCode = (item && (item.hsnCode || src.hsnCode)) || '';
    const rate = Number(((item && (item.rate ?? src.rate ?? src.sellingPrice)) ?? 0)) || 0;
        const quantity = Number(item && (item.quantity ?? 0) ) || 0;
        const taxSlab = Number(item && (item.taxSlab ?? src.taxSlab ?? item.taxRate ?? 0) ) || 0;
        const units = (item && (item.units || src.units)) || 'pcs';
        const discountPct = Number(item && (item.discount ?? 0) ) || 0;

        const gross = rate * quantity;
        const discountAmt = (gross * discountPct) / 100;
        const taxable = gross - discountAmt;
        const gstAmount = (taxable * taxSlab) / 100;
        const totalWithGst = taxable + gstAmount;

        totalQuantity += quantity;
        totalGST += gstAmount;
        totalDiscount += discountAmt;

        const hsnKey = hsnCode || 'NA';
        if (!taxSummary[hsnKey]) {
            taxSummary[hsnKey] = isInterState
                ? { hsnCode: hsnKey, taxableAmount: 0, igstRate: taxSlab, igstAmount: 0, totalTax: 0, isInterState: true }
                : { hsnCode: hsnKey, taxableAmount: 0, cgstRate: taxSlab / 2, sgstRate: taxSlab / 2, cgstAmount: 0, sgstAmount: 0, totalTax: 0, isInterState: false };
        }
        taxSummary[hsnKey].taxableAmount += taxable;
        taxSummary[hsnKey].totalTax += gstAmount;
        if (isInterState) taxSummary[hsnKey].igstAmount = (taxSummary[hsnKey].igstAmount || 0) + gstAmount;
        else {
            taxSummary[hsnKey].cgstAmount = (taxSummary[hsnKey].cgstAmount || 0) + gstAmount / 2;
            taxSummary[hsnKey].sgstAmount = (taxSummary[hsnKey].sgstAmount || 0) + gstAmount / 2;
        }

        itemsHtml += `\n            <tr>\n                <td style="text-align: center;">${index + 1}</td>\n                <td style="text-align: left;">${escapeHtml(itemName)} ${escapeHtml(units ? `(${units})` : '')}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(rate))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(gross))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(discountAmt))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(taxable))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(gstAmount))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(totalWithGst))}</td>\n            </tr>\n        `;
    }

    const totalTaxableAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.taxableAmount || 0), 0);
    const totalIgstAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.igstAmount || 0), 0);
    const totalCgstAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
    const totalSgstAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.sgstAmount || 0), 0);

    const roundOff = Math.round((totalGST + Number.EPSILON) * 100) / 100;

    html = html.replace(/{{items}}/g, itemsHtml);
    html = html.replace(/{{totalQuantity}}/g, escapeHtml(String(totalQuantity)));
    html = html.replace(/{{totalDiscount}}/g, escapeHtml(formatCurrency(totalDiscount)));
    html = html.replace(/{{totalGST}}/g, escapeHtml(formatCurrency(roundOff)));
    html = html.replace(/{{totalAmount}}/g, escapeHtml(formatCurrency(invoiceData && invoiceData.totalAmount || 0)));
    html = html.replace(/{{netAmount}}/g, escapeHtml(formatCurrency(invoiceData && invoiceData.netAmount || 0)));
    const subtotalVal = ((invoiceData && (invoiceData.subTotal ?? invoiceData.subtotal)) ?? totalTaxableAmount) || 0;
    html = html.replace(/{{subTotal}}/g, escapeHtml(formatCurrency(subtotalVal)));
    html = html.replace(/{{subtotal}}/g, escapeHtml(formatCurrency(subtotalVal)));

    let taxSummaryHtml = '';
    Object.values(taxSummary).forEach((taxItem) => {
        taxSummaryHtml += `\n            <tr>\n                <td style="text-align: left;">${escapeHtml(taxItem.hsnCode)}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.taxableAmount))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.igstAmount || 0))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.cgstAmount || 0))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.sgstAmount || 0))}</td>\n                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.totalTax))}</td>\n            </tr>\n        `;
    });

    html = html.replace(/{{taxSummary}}/g, taxSummaryHtml);


    const paymentDetails = invoiceData && invoiceData.paymentDetails ? invoiceData.paymentDetails : {};
    const totalForBalance = (invoiceData && invoiceData.grandTotal != null ? invoiceData.grandTotal : (invoiceData && invoiceData.totalAmount)) || 0;
    const balance = Number(invoiceData && (invoiceData.balance ?? totalForBalance)) || 0;
    const amountForQr = balance > 0 ? balance.toFixed(2) : undefined;

    // Prefer precomputed QR image/link if present on paymentDetails (set by caller).
    let upiQrCode = EMPTY_PIXEL;
    let upiQrImage = EMPTY_PIXEL;
    let upiLink = '';
    if (paymentDetails) {
        if (paymentDetails.preRenderedUpiQr || paymentDetails.upiQrImage) {
            upiQrImage = paymentDetails.preRenderedUpiQr || paymentDetails.upiQrImage;
            upiQrCode = upiQrImage;
            upiLink = paymentDetails.upiLink || '';
        } else {
            // Fallback: attempt to generate QR from upiId if provided
            try {
                if (paymentDetails.upiId) {
                    const upi = await generateUpiQr(paymentDetails.upiId, amountForQr);
                    upiQrCode = upi && upi.qrCodeImage ? upi.qrCodeImage : EMPTY_PIXEL;
                    upiQrImage = upiQrCode;
                    upiLink = upi && upi.upiLink ? upi.upiLink : '';
                }
            } catch (upiErr) {
                console.warn('[PDF] generateUpiQr failed, continuing without QR:', upiErr && upiErr.stack ? upiErr.stack : upiErr);
            }
        }
    }

    const paymentMode = paymentDetails && paymentDetails.mode ? paymentDetails.mode : 'Not specified';
    const transactionId = paymentDetails && (paymentDetails.transactionId || paymentDetails.txnId) ? (paymentDetails.transactionId || paymentDetails.txnId) : 'N/A';
    const paymentDate = paymentDetails && paymentDetails.date ? new Date(paymentDetails.date).toLocaleDateString('en-GB') : 'N/A';
    const amountPaid = paymentDetails && paymentDetails.amount ? Number(paymentDetails.amount) : 0.00;

    html = html.replace(/{{upiQrCode}}/g, upiQrCode);
    html = html.replace(/{{upiQrImage}}/g, upiQrImage);
    html = html.replace(/{{upiLink}}/g, escapeHtml(upiLink || ''));
    html = html.replace(/{{guestName}}/g, escapeHtml(invoiceData && invoiceData.guestName ? invoiceData.guestName : ''));
    html = html.replace(/{{paymentMode}}/g, escapeHtml(paymentMode));
    html = html.replace(/{{transactionId}}/g, escapeHtml(transactionId));
    html = html.replace(/{{paymentDate}}/g, escapeHtml(paymentDate));
    html = html.replace(/{{amountPaid}}/g, escapeHtml(formatCurrency(amountPaid)));

    // Generic fallbacks (keep minimal)
    html = html.replace(/{{termsList}}/g, '');
    html = html.replace(/{{signatureImage}}/g, '');

    // Remove leftover tokens
    html = html.replace(/\{\{\s*[^}]+\s*\}\}/g, '');

    return html;
}

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    unsafe = String(unsafe);
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrency(amount) {
    if (amount == null) return '0.00';
    amount = Number(amount);
    if (Number.isNaN(amount)) return '0.00';
    return amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace('₹', '').trim();
}

module.exports = { generateInvoicePDF, generateThermalPDF, replacePlaceholders };
    html = html.replace(/{{signatureImage}}/g, '');
