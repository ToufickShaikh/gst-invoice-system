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

async function replacePlaceholders(html, invoiceData) {
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
    const invoiceNumber = invoiceData.invoiceNumber || invoiceData._id || '';
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
    const upiQrCode = paymentDetails.upiId ? await generateUpiQr(paymentDetails.upiId, invoiceData.invoiceNumber) : '';
    const paymentMode = paymentDetails.mode || 'Not specified';
    const transactionId = paymentDetails.transactionId || paymentDetails.txnId || 'N/A';
    const paymentDate = paymentDetails.date ? new Date(paymentDetails.date).toLocaleDateString('en-GB') : 'N/A';
    const amountPaid = paymentDetails.amount ? Number(paymentDetails.amount).toFixed(2) : 0.00;

    html = html.replace(/{{upiQrCode}}/g, upiQrCode);
    html = html.replace(/{{paymentMode}}/g, escapeHtml(paymentMode));
    html = html.replace(/{{transactionId}}/g, escapeHtml(transactionId));
    html = html.replace(/{{paymentDate}}/g, escapeHtml(paymentDate));
    html = html.replace(/{{amountPaid}}/g, escapeHtml(formatCurrency(amountPaid)));

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

module.exports = { generateInvoicePDF };
