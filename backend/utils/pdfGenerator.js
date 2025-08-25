const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const { generateUpiQr } = require('./upiHelper');
const { extractStateCode, COMPANY_STATE_CODE } = require('./taxHelpers');
const company = require('../config/company');

async function generateInvoicePDF(invoiceData, fileName) {
    console.log(`[PDF] Starting PDF generation for invoice: ${invoiceData.invoiceNumber}`);
    let browser = null;
    try {
        // Use the new Zoho-like template
        const templatePath = path.resolve(__dirname, '../templates/invoiceTemplate-new.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // Replace placeholders
        html = await replacePlaceholders(html, invoiceData);

        const outputDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(outputDir, { recursive: true });
        const safeNumber = (invoiceData.invoiceNumber || `INV-${Date.now()}`);
        const pdfFileName = fileName && fileName.toString().trim().length > 0 ? fileName : `invoice-${safeNumber}.pdf`;
        const pdfPath = path.join(outputDir, pdfFileName);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' }
        });

        console.log(`[PDF] PDF generated successfully: ${pdfPath}`);
        return `/invoices/${path.basename(pdfPath)}`;
    } catch (error) {
        console.error(`[PDF] Failed to generate PDF for invoice ${invoiceData.invoiceNumber}:`, error);
        throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function generateThermalPDF(invoiceData, fileName) {
    console.log(`[PDF] Starting thermal PDF generation for invoice: ${invoiceData.invoiceNumber}`);
    let browser = null;
    try {
        const templatePath = path.resolve(__dirname, '../templates/thermal-2in5.html');
        let html = await fs.readFile(templatePath, 'utf-8');
        html = await replacePlaceholders(html, invoiceData);

        const outputDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(outputDir, { recursive: true });
        const pdfFileName = fileName && fileName.toString().trim().length > 0 ? fileName : `invoice-thermal-${invoiceData.invoiceNumber || Date.now()}.pdf`;
        const pdfPath = path.join(outputDir, pdfFileName);

        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        try {
            // Puppeteer may reject non-numeric height, so only set width and let height auto-size
            await page.pdf({ path: pdfPath, width: '64mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
            console.log(`[PDF] Thermal PDF generated successfully: ${pdfPath}`);
            return `/invoices/${path.basename(pdfPath)}`;
        } catch (pdfErr) {
            console.error('[PDF] Thermal PDF page.pdf() failed:', pdfErr && pdfErr.stack ? pdfErr.stack : pdfErr);
            // dump HTML to debug file for inspection
            try {
                const debugDir = path.resolve(__dirname, '../invoices/debug-html');
                await fs.mkdir(debugDir, { recursive: true });
                const debugFile = path.join(debugDir, `thermal-html-${invoiceData._id || invoiceData.invoiceNumber || Date.now()}.html`);
                await fs.writeFile(debugFile, html, 'utf-8');
                console.log('[PDF] Wrote thermal HTML to debug file:', debugFile);
            } catch (writeErr) {
                console.error('[PDF] Failed to write thermal HTML debug file:', writeErr && writeErr.stack ? writeErr.stack : writeErr);
            }
            // Attempt fallback to regular A4 invoice PDF to avoid blocking the user
            try {
                console.log('[PDF] Attempting fallback: generate A4 invoice PDF instead');
                if (browser) await browser.close();
                // reuse generateInvoicePDF which will create its own browser instance
                const fallbackPath = await generateInvoicePDF(invoiceData, fileName && fileName.toString().trim().length > 0 ? fileName : undefined);
                console.log('[PDF] Fallback A4 PDF generated:', fallbackPath);
                return fallbackPath;
            } catch (fallbackErr) {
                console.error('[PDF] Fallback A4 PDF generation also failed:', fallbackErr && fallbackErr.stack ? fallbackErr.stack : fallbackErr);
                throw new Error(`Thermal PDF generation failed and fallback also failed: ${pdfErr.message}; ${fallbackErr.message}`);
            }
        }
    } catch (error) {
        console.error(`[PDF] Failed to generate thermal PDF for invoice ${invoiceData.invoiceNumber}:`, error && error.stack ? error.stack : error);
        throw new Error(`Thermal PDF generation failed: ${error.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

async function replacePlaceholders(html, invoiceData) {
    try {
        // Diagnostic logging to help debug missing fields in templates
        const id = invoiceData?._id || invoiceData?.id || 'N/A';
        const invNum = invoiceData?.invoiceNumber || invoiceData?._id || 'N/A';
        const hasCustomer = invoiceData && typeof invoiceData.customer === 'object' && Object.keys(invoiceData.customer || {}).length > 0;
        const itemsLen = Array.isArray(invoiceData?.items) ? invoiceData.items.length : 0;
        console.log(`[PDF] replacePlaceholders called for invoice id=${id}, invoiceNumber=${invNum}, hasCustomer=${hasCustomer}, items=${itemsLen}`);
        // Log top-level keys present
        console.log('[PDF] invoiceData keys:', Object.keys(invoiceData || {}).slice(0,40));
    } catch (dbgErr) {
        console.warn('[PDF] replacePlaceholders debug log failed:', dbgErr);
    }
    // Company details
    html = html.replace(/{{companyName}}/g, escapeHtml(company.name));
    html = html.replace(/{{companyAddress}}/g, escapeHtml(company.address));
    html = html.replace(/{{companyPhone}}/g, escapeHtml(company.phone));
    html = html.replace(/{{companyEmail}}/g, escapeHtml(company.email));
    html = html.replace(/{{companyGSTIN}}/g, escapeHtml(company.gstin));
    html = html.replace(/{{companyState}}/g, escapeHtml(company.state));
    html = html.replace(/{{companyLogo}}/g, escapeHtml(company.logoUrl || ''));

    // Customer details
    const customer = invoiceData.customer && typeof invoiceData.customer === 'object' ? invoiceData.customer : (invoiceData._doc?.customer || {});
    const customerName = customer?.firmName || customer?.name || '';
    const customerAddress = customer?.firmAddress || customer?.billingAddress || '';
    const customerPhone = customer?.contact || customer?.phone || '';
    const customerEmail = customer?.email || '';
    const customerGSTIN = customer?.gstNo || customer?.gstin || '';
    const customerState = customer?.state || '33-Tamil Nadu';

    html = html.replace(/{{customerName}}/g, escapeHtml(customerName));
    html = html.replace(/{{customerAddress}}/g, escapeHtml(customerAddress));
    html = html.replace(/{{customerPhone}}/g, escapeHtml(customerPhone));
    html = html.replace(/{{customerEmail}}/g, escapeHtml(customerEmail));
    html = html.replace(/{{customerGSTIN}}/g, escapeHtml(customerGSTIN));
    html = html.replace(/{{customerState}}/g, escapeHtml(customerState));

    // Invoice meta
    // Ensure invoice number is always a useful string (fallback to _id or 'N/A')
    const invoiceNumber = invoiceData.invoiceNumber || (invoiceData._id ? String(invoiceData._id) : 'N/A');
    const invoiceDate = new Date(invoiceData.invoiceDate || Date.now()).toLocaleDateString('en-GB');
    const dueDate = new Date(invoiceData.dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');
    const placeOfSupply = customerState;

    html = html.replace(/{{invoiceNumber}}/g, escapeHtml(String(invoiceNumber)));
    html = html.replace(/{{invoiceDate}}/g, escapeHtml(invoiceDate));
    html = html.replace(/{{dueDate}}/g, escapeHtml(dueDate));
    html = html.replace(/{{placeOfSupply}}/g, escapeHtml(placeOfSupply));

    const customerStateCode = extractStateCode(customerState);
    const isInterState = customerStateCode && customerStateCode !== COMPANY_STATE_CODE;
    const paymentStatus = invoiceData.paymentStatus || ((Number(invoiceData.balance) || 0) <= 0 ? 'Paid' : (Number(invoiceData.paidAmount || 0) > 0 ? 'Partial' : 'Pending'));
    html = html.replace(/{{paymentStatus}}/g, escapeHtml(paymentStatus));
    html = html.replace(/{{supplyType}}/g, isInterState ? 'Interstate' : 'Intrastate');

    // Items and tax summary
    let totalQuantity = 0;
    let totalGST = 0;
    let totalDiscount = 0;
    let itemsHtml = '';
    const taxSummary = {};
    const items = Array.isArray(invoiceData.items) ? invoiceData.items : [];

    items.forEach((item, index) => {
        const src = item.item && typeof item.item === 'object' ? item.item : item;
        const itemName = item.name || src?.name || '';
        const hsnCode = item.hsnCode || src?.hsnCode || '';
        const rate = Number(item.rate ?? src?.rate ?? src?.sellingPrice ?? 0) || 0;
        const quantity = Number(item.quantity || 0) || 0;
        const taxSlab = Number(item.taxSlab ?? src?.taxSlab ?? item.taxRate ?? 0) || 0;
        const units = item.units || src?.units || 'pcs';
        const discountPct = Number(item.discount || 0) || 0;

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

        itemsHtml += `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td style="text-align: left;">${escapeHtml(itemName)} (${escapeHtml(units)})</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(rate))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(gross))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(discountAmt))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(taxable))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(gstAmount))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(totalWithGst))}</td>
            </tr>
        `;
    });

    const totalTaxableAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.taxableAmount || 0), 0);
    const totalIgstAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.igstAmount || 0), 0);
    const totalCgstAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
    const totalSgstAmount = Object.values(taxSummary).reduce((sum, item) => sum + (item.sgstAmount || 0), 0);

    // Round off to avoid floating point issues
    const roundOff = Math.round((totalGST + Number.EPSILON) * 100) / 100;

    html = html.replace(/{{items}}/g, itemsHtml);
    html = html.replace(/{{totalQuantity}}/g, escapeHtml(String(totalQuantity)));
    html = html.replace(/{{totalDiscount}}/g, escapeHtml(formatCurrency(totalDiscount)));
    html = html.replace(/{{totalGST}}/g, escapeHtml(formatCurrency(roundOff)));
    html = html.replace(/{{totalAmount}}/g, escapeHtml(formatCurrency(invoiceData.totalAmount || 0)));
    html = html.replace(/{{netAmount}}/g, escapeHtml(formatCurrency(invoiceData.netAmount || 0)));
    // Provide both subtotal variants to be safe across templates
    const subtotalVal = (invoiceData.subTotal ?? invoiceData.subtotal ?? totalTaxableAmount) || 0;
    html = html.replace(/{{subTotal}}/g, escapeHtml(formatCurrency(subtotalVal)));
    html = html.replace(/{{subtotal}}/g, escapeHtml(formatCurrency(subtotalVal)));

    // Tax summary table
    let taxSummaryHtml = '';
    Object.values(taxSummary).forEach((taxItem) => {
        taxSummaryHtml += `
            <tr>
                <td style="text-align: left;">${escapeHtml(taxItem.hsnCode)}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.taxableAmount))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.igstAmount || 0))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.cgstAmount || 0))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.sgstAmount || 0))}</td>
                <td style="text-align: right;">${escapeHtml(formatCurrency(taxItem.totalTax))}</td>
            </tr>
        `;
    });

    html = html.replace(/{{taxSummary}}/g, taxSummaryHtml);

    // Payment details
    const paymentDetails = invoiceData.paymentDetails || {};
    // Determine amount to encode in UPI QR: prefer explicit balance, else grandTotal/totalAmount
    const totalForBalance = (invoiceData.grandTotal != null ? invoiceData.grandTotal : invoiceData.totalAmount) || 0;
    const balance = Number(invoiceData.balance ?? totalForBalance) || 0;
    const amountForQr = balance > 0 ? balance.toFixed(2) : undefined;
    const upiQr = paymentDetails.upiId ? await generateUpiQr(paymentDetails.upiId, amountForQr) : null;
    const upiQrCode = upiQr ? upiQr.qrCodeImage : '';
    const upiQrImage = upiQr ? upiQr.qrCodeImage : '';
    const upiLink = upiQr ? upiQr.upiLink : '';
    // If no QR image is available, use a 1x1 transparent GIF data URI so <img src="..."> does not request the current document
    const EMPTY_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    const paymentMode = paymentDetails.mode || 'Not specified';
    const transactionId = paymentDetails.transactionId || paymentDetails.txnId || 'N/A';
    const paymentDate = paymentDetails.date ? new Date(paymentDetails.date).toLocaleDateString('en-GB') : 'N/A';
    const amountPaid = paymentDetails.amount ? Number(paymentDetails.amount).toFixed(2) : 0.00;

    // UPI placeholders: insert data-url into src attributes
    html = html.replace(/{{upiQrCode}}/g, upiQrCode || EMPTY_PIXEL);
    html = html.replace(/{{upiQrImage}}/g, upiQrImage || EMPTY_PIXEL);
    html = html.replace(/{{upiLink}}/g, escapeHtml(upiLink || ''));
    html = html.replace(/{{guestName}}/g, escapeHtml(invoiceData.guestName || ''));
    html = html.replace(/{{paymentMode}}/g, escapeHtml(paymentMode));
    html = html.replace(/{{transactionId}}/g, escapeHtml(transactionId));
    html = html.replace(/{{paymentDate}}/g, escapeHtml(paymentDate));
    html = html.replace(/{{amountPaid}}/g, escapeHtml(formatCurrency(amountPaid)));

    // Generic safe fallbacks for commonly used placeholders in templates to avoid literal 'undefined' showing up
    html = html.replace(/{{termsList}}/g, '');
    html = html.replace(/{{signatureImage}}/g, '');
    html = html.replace(/{{bankName}}/g, '');
    html = html.replace(/{{bankAccount}}/g, '');
    html = html.replace(/{{bankIFSC}}/g, '');
    html = html.replace(/{{bankHolder}}/g, '');
    html = html.replace(/{{amountInWords}}/g, '');
    html = html.replace(/{{roundOff}}/g, escapeHtml(formatCurrency(roundOff)));
    html = html.replace(/{{receivedAmount}}/g, escapeHtml(formatCurrency(invoiceData.receivedAmount || 0)));
    html = html.replace(/{{balanceAmount}}/g, escapeHtml(formatCurrency(balance || 0)));

    return html;
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCurrency(amount) {
    if (amount == null) return '0.00';
    amount = Number(amount);
    return amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace('₹', '').trim();
}

module.exports = { generateInvoicePDF, generateThermalPDF };
