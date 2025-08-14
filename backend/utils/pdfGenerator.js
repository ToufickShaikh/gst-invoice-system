const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const { generateUpiQr } = require('./upiHelper');
const { extractStateCode, COMPANY_STATE_CODE } = require('./taxHelpers');
const company = require('../config/company');

async function generateInvoicePDF(invoiceData) {
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
        const pdfPath = path.join(outputDir, `invoice-${safeNumber}.pdf`);

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

        // Rows for template-new.html (Amount column = taxable)
        itemsHtml += `
            <tr>
                <td class="center">${index + 1}</td>
                <td class="left">${escapeHtml(itemName)}</td>
                <td class="center">${escapeHtml(hsnCode)}</td>
                <td class="center">${quantity}</td>
                <td class="center">${escapeHtml(units)}</td>
                <td class="right">₹${rate.toFixed(2)}</td>
                <td class="right">₹${taxable.toFixed(2)}</td>
                <td class="center">${taxSlab}%</td>
                <td class="right">₹${totalWithGst.toFixed(2)}</td>
            </tr>`;
    });

    html = html.replace(/{{itemsTable}}/g, itemsHtml);
    html = html.replace(/{{totalQuantity}}/g, String(totalQuantity));

    // Totals
    const shippingCharges = Number(invoiceData.shippingCharges || 0);
    const roundOff = Number(invoiceData.roundOff || 0);
    const receivedAmount = Number(invoiceData.paidAmount || 0);

    let subTotalCalc = Number(invoiceData.subTotal);
    if (!subTotalCalc && Object.keys(taxSummary).length) {
        subTotalCalc = Object.values(taxSummary).reduce((s, t) => s + t.taxableAmount, 0);
    }
    let totalGSTCalc = Number(invoiceData.totalTax);
    if (!totalGSTCalc && Object.keys(taxSummary).length) {
        totalGSTCalc = Object.values(taxSummary).reduce((s, t) => s + t.totalTax, 0);
    }
    let totalAmountCalc = Number(invoiceData.totalAmount || invoiceData.grandTotal);
    if (!totalAmountCalc) totalAmountCalc = subTotalCalc + totalGSTCalc + shippingCharges + roundOff;
    const balanceAmount = Number(invoiceData.balance != null ? invoiceData.balance : (totalAmountCalc - receivedAmount));

    html = html.replace(/{{subTotal}}/g, (subTotalCalc || 0).toFixed(2));
    html = html.replace(/{{totalGST}}/g, (totalGSTCalc || 0).toFixed(2));
    html = html.replace(/{{totalDiscount}}/g, (totalDiscount || 0).toFixed(2));
    html = html.replace(/{{shippingCharges}}/g, shippingCharges.toFixed(2));
    html = html.replace(/{{roundOff}}/g, roundOff.toFixed(2));
    html = html.replace(/{{totalAmount}}/g, (totalAmountCalc || 0).toFixed(2));
    html = html.replace(/{{receivedAmount}}/g, receivedAmount.toFixed(2));
    html = html.replace(/{{balanceAmount}}/g, balanceAmount.toFixed(2));

    // Tax Summary table
    let taxSummaryHtml = '';
    let taxSummaryTotals = { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 };
    Object.values(taxSummary).forEach(tax => {
        taxSummaryTotals.taxableAmount += tax.taxableAmount;
        taxSummaryTotals.totalTax += tax.totalTax;
        if (tax.isInterState) {
            taxSummaryTotals.igstAmount += tax.igstAmount;
            taxSummaryHtml += `
                <tr>
                    <td class="left">${escapeHtml(tax.hsnCode)}</td>
                    <td class="right">₹${tax.taxableAmount.toFixed(2)}</td>
                    <td class="center">${tax.igstRate}%</td>
                    <td class="right">₹${tax.igstAmount.toFixed(2)}</td>
                    <td class="center">-</td>
                    <td class="right">-</td>
                    <td class="center">-</td>
                    <td class="right">-</td>
                    <td class="right">₹${tax.totalTax.toFixed(2)}</td>
                </tr>`;
        } else {
            taxSummaryTotals.cgstAmount += tax.cgstAmount;
            taxSummaryTotals.sgstAmount += tax.sgstAmount;
            taxSummaryHtml += `
                <tr>
                    <td class="left">${escapeHtml(tax.hsnCode)}</td>
                    <td class="right">₹${tax.taxableAmount.toFixed(2)}</td>
                    <td class="center">-</td>
                    <td class="right">-</td>
                    <td class="center">${tax.cgstRate}%</td>
                    <td class="right">₹${tax.cgstAmount.toFixed(2)}</td>
                    <td class="center">${tax.sgstRate}%</td>
                    <td class="right">₹${tax.sgstAmount.toFixed(2)}</td>
                    <td class="right">₹${tax.totalTax.toFixed(2)}</td>
                </tr>`;
        }
    });

    html = html.replace(/{{taxSummaryTable}}/g, taxSummaryHtml);
    html = html.replace(/{{taxSummaryTotal\.taxableAmount}}/g, taxSummaryTotals.taxableAmount.toFixed(2));
    html = html.replace(/{{taxSummaryTotal\.igstAmount}}/g, taxSummaryTotals.igstAmount ? taxSummaryTotals.igstAmount.toFixed(2) : '0.00');
    html = html.replace(/{{taxSummaryTotal\.cgstAmount}}/g, taxSummaryTotals.cgstAmount ? taxSummaryTotals.cgstAmount.toFixed(2) : '0.00');
    html = html.replace(/{{taxSummaryTotal\.sgstAmount}}/g, taxSummaryTotals.sgstAmount ? taxSummaryTotals.sgstAmount.toFixed(2) : '0.00');
    html = html.replace(/{{taxSummaryTotal\.totalTax}}/g, taxSummaryTotals.totalTax.toFixed(2));

    // Amount in words
    const amountInWords = convertToWords(totalAmountCalc || 0);
    html = html.replace(/{{amountInWords}}/g, escapeHtml(amountInWords));

    // Bank details
    html = html.replace(/{{bankName}}/g, escapeHtml(company.bank.name || ''));
    html = html.replace(/{{bankAccount}}/g, escapeHtml(company.bank.account || ''));
    html = html.replace(/{{bankIFSC}}/g, escapeHtml(company.bank.ifsc || ''));
    html = html.replace(/{{bankHolder}}/g, escapeHtml(company.bank.holder || ''));

    // UPI QR image
    let upiQrDataUrl = '';
    try {
        if (company.upi.qrImageUrl) {
            upiQrDataUrl = company.upi.qrImageUrl;
        } else if (company.upi.id) {
            const amountForQr = balanceAmount > 0 ? balanceAmount.toFixed(2) : undefined;
            const { qrCodeImage } = await generateUpiQr(company.upi.id, amountForQr);
            upiQrDataUrl = qrCodeImage;
        }
    } catch (e) {
        console.error('[PDF] UPI QR generation failed:', e.message);
    }
    html = html.replace(/{{upiQrImage}}/g, upiQrDataUrl);

    // Signature
    html = html.replace(/{{signatureImage}}/g, escapeHtml(company.signatureImageUrl || ''));

    // Terms & Conditions
    const termsList = Array.isArray(company.terms) ? company.terms : [];
    const termsHtml = termsList.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    html = html.replace(/{{termsList}}/g, termsHtml);

    return html;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function convertToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (!num || isNaN(num)) return 'Zero Rupees Only';

    let words = '';

    function toWords(n) {
        let str = '';
        if (n > 99) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
        } else if (n > 9) {
            str += teens[n - 10];
        } else {
            str += ones[n];
        }
        return str.trim();
    }

    let amount = Math.floor(num);
    if (amount >= 10000000) {
        words += toWords(Math.floor(amount / 10000000)) + ' Crore ';
        amount %= 10000000;
    }
    if (amount >= 100000) {
        words += toWords(Math.floor(amount / 100000)) + ' Lakh ';
        amount %= 100000;
    }
    if (amount >= 1000) {
        words += toWords(Math.floor(amount / 1000)) + ' Thousand ';
        amount %= 1000;
    }
    if (amount > 0) {
        words += toWords(amount);
    }

    return words.trim() + ' Rupees Only';
}

module.exports = { generateInvoicePDF };
