const fs = require('fs/promises');
const path = require('path');
const puppeteer = require('puppeteer');
const { generateUpiQr } = require('./upiHelper');
const { extractStateCode, COMPANY_STATE_CODE } = require('./taxHelpers');

async function generateInvoicePDF(invoiceData) {
    console.log(`[PDF] Starting PDF generation for invoice: ${invoiceData.invoiceNumber}`);
    let browser = null;
    try {
        const templatePath = path.resolve(__dirname, '../templates/invoiceTemplate.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // Replace placeholders
        html = replacePlaceholders(html, invoiceData);

        const outputDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(outputDir, { recursive: true });
        const pdfPath = path.join(outputDir, `invoice-${invoiceData.invoiceNumber}.pdf`);

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
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            }
        });

        console.log(`[PDF] PDF generated successfully: ${pdfPath}`);
        return `/invoices/invoice-${invoiceData.invoiceNumber}.pdf`;
    } catch (error) {
        console.error(`[PDF] Failed to generate PDF for invoice ${invoiceData.invoiceNumber}:`, error);
        throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function replacePlaceholders(html, invoiceData) {
    // Company details
    html = html.replace(/{{companyName}}/g, 'Shaikh Tools And Dies');
    html = html.replace(/{{companyAddress}}/g, 'NO.11/44 EDAPALLAM STREET PARK TOWN');
    html = html.replace(/{{companyPhone}}/g, '8939487096');
    html = html.replace(/{{companyEmail}}/g, 'shaikhtoolsanddies@yahoo.com');
    html = html.replace(/{{companyGSTIN}}/g, '33BVRPS2849Q1ZH');
    html = html.replace(/{{companyState}}/g, '33-Tamil Nadu');
    html = html.replace(/{{companyLogo}}/g, 'https://bri.ct.ws/include/logo.png');

    // Customer details
    const customer = invoiceData.customer;
    html = html.replace(/{{customerName}}/g, customer?.firmName || customer?.name || '');
    html = html.replace(/{{customerAddress}}/g, customer?.firmAddress || '');
    html = html.replace(/{{customerPhone}}/g, customer?.contact || '');
    html = html.replace(/{{customerEmail}}/g, customer?.email || '');
    html = html.replace(/{{customerGSTIN}}/g, customer?.gstNo || '');
    html = html.replace(/{{customerState}}/g, customer?.state || '33-Tamil Nadu');

    // Invoice details
    html = html.replace(/{{invoiceNumber}}/g, invoiceData.invoiceNumber || '');
    html = html.replace(/{{invoiceDate}}/g, new Date(invoiceData.invoiceDate || Date.now()).toLocaleDateString('en-GB'));
    html = html.replace(/{{dueDate}}/g, new Date(invoiceData.dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'));
    html = html.replace(/{{placeOfSupply}}/g, customer?.state || '33-Tamil Nadu');
    html = html.replace(/{{paymentStatus}}/g, invoiceData.paymentStatus || 'Pending');

    const customerStateCode = extractStateCode(customer?.state);
    const isInterState = customerStateCode && customerStateCode !== COMPANY_STATE_CODE;

    let totalQuantity = 0;
    let totalGST = 0;
    let itemsHtml = '';
    const taxSummary = {};

    if (invoiceData.items && invoiceData.items.length > 0) {
        invoiceData.items.forEach((item, index) => {
            const itemName = item.name || item.item?.name || '';
            const hsnCode = item.hsnCode || item.item?.hsnCode || '';
            const rate = item.rate || item.item?.rate || 0;
            const quantity = item.quantity || 0;
            const taxSlab = item.taxSlab || item.item?.taxSlab || 18;
            const units = item.units || item.item?.units || 'per piece';

            const itemTotal = rate * quantity;
            const gstAmount = (itemTotal * taxSlab) / 100;
            const totalWithGst = itemTotal + gstAmount;

            totalQuantity += quantity;
            totalGST += gstAmount;

            if (!taxSummary[hsnCode]) {
                if (isInterState) {
                    taxSummary[hsnCode] = { hsnCode, taxableAmount: 0, igstRate: taxSlab, igstAmount: 0, totalTax: 0, isInterState: true };
                } else {
                    taxSummary[hsnCode] = { hsnCode, taxableAmount: 0, cgstRate: taxSlab / 2, sgstRate: taxSlab / 2, cgstAmount: 0, sgstAmount: 0, totalTax: 0, isInterState: false };
                }
            }

            taxSummary[hsnCode].taxableAmount += itemTotal;
            taxSummary[hsnCode].totalTax += gstAmount;

            if (isInterState) {
                taxSummary[hsnCode].igstAmount += gstAmount;
            } else {
                taxSummary[hsnCode].cgstAmount += gstAmount / 2;
                taxSummary[hsnCode].sgstAmount += gstAmount / 2;
            }

            itemsHtml += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td class="text-left">${itemName}</td>
                <td class="text-center">${hsnCode}</td>
                <td class="text-center">${quantity}</td>
                <td class="text-center">${units}</td>
                <td class="text-right">₹${rate.toFixed(2)}</td>
                <td class="text-center">${taxSlab}%</td>
                <td class="text-right">₹${totalWithGst.toFixed(2)}</td>
            </tr>`;
        });
    }

    html = html.replace(/{{itemsTable}}/g, itemsHtml);
    html = html.replace(/{{totalQuantity}}/g, totalQuantity);
    html = html.replace(/{{totalGST}}/g, totalGST.toFixed(2));
    html = html.replace(/{{totalAmount}}/g, (invoiceData.totalAmount || invoiceData.grandTotal || 0).toFixed(2));
    html = html.replace(/{{subTotal}}/g, (invoiceData.subTotal || 0).toFixed(2));

    let taxSummaryHtml = '';
    let taxSummaryTotals = { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 };

    Object.values(taxSummary).forEach(tax => {
        taxSummaryTotals.taxableAmount += tax.taxableAmount;
        taxSummaryTotals.totalTax += tax.totalTax;

        if (tax.isInterState) {
            taxSummaryTotals.igstAmount += tax.igstAmount;
            taxSummaryHtml += `
            <tr>
                <td class="text-left">${tax.hsnCode}</td>
                <td class="text-right">₹${tax.taxableAmount.toFixed(2)}</td>
                <td class="text-center">${tax.igstRate}%</td>
                <td class="text-right">₹${tax.igstAmount.toFixed(2)}</td>
                <td class="text-center">-</td>
                <td class="text-right">-</td>
                <td class="text-center">-</td>
                <td class="text-right">-</td>
                <td class="text-right">₹${tax.totalTax.toFixed(2)}</td>
            </tr>`;
        } else {
            taxSummaryTotals.cgstAmount += tax.cgstAmount;
            taxSummaryTotals.sgstAmount += tax.sgstAmount;
            taxSummaryHtml += `
            <tr>
                <td class="text-left">${tax.hsnCode}</td>
                <td class="text-right">₹${tax.taxableAmount.toFixed(2)}</td>
                <td class="text-center">-</td>
                <td class="text-right">-</td>
                <td class="text-center">${tax.cgstRate}%</td>
                <td class="text-right">₹${tax.cgstAmount.toFixed(2)}</td>
                <td class="text-center">${tax.sgstRate}%</td>
                <td class="text-right">₹${tax.sgstAmount.toFixed(2)}</td>
                <td class="text-right">₹${tax.totalTax.toFixed(2)}</td>
            </tr>`;
        }
    });

    html = html.replace(/{{taxSummaryTable}}/g, taxSummaryHtml);
    html = html.replace(/{{taxSummaryTotal\.taxableAmount}}/g, taxSummaryTotals.taxableAmount.toFixed(2));

    if (isInterState) {
        html = html.replace(/{{taxSummaryTotal\.cgstAmount}}/g, '-');
        html = html.replace(/{{taxSummaryTotal\.sgstAmount}}/g, '-');
        html = html.replace(/{{taxSummaryTotal\.igstAmount}}/g, taxSummaryTotals.igstAmount.toFixed(2));
    } else {
        html = html.replace(/{{taxSummaryTotal\.cgstAmount}}/g, taxSummaryTotals.cgstAmount.toFixed(2));
        html = html.replace(/{{taxSummaryTotal\.sgstAmount}}/g, taxSummaryTotals.sgstAmount.toFixed(2));
        html = html.replace(/{{taxSummaryTotal\.igstAmount}}/g, '-');
    }

    html = html.replace(/{{taxSummaryTotal\.totalTax}}/g, taxSummaryTotals.totalTax.toFixed(2));

    const amountInWords = convertToWords(invoiceData.totalAmount || invoiceData.grandTotal || 0);
    html = html.replace(/{{amountInWords}}/g, amountInWords);

    html = html.replace(/{{receivedAmount}}/g, (invoiceData.paidAmount || 0).toFixed(2));
    html = html.replace(/{{balanceAmount}}/g, (invoiceData.balance || (invoiceData.totalAmount || invoiceData.grandTotal || 0) - (invoiceData.paidAmount || 0)).toFixed(2));

    const balanceAmount = invoiceData.balance || (invoiceData.totalAmount || invoiceData.grandTotal || 0) - (invoiceData.paidAmount || 0);
    let upiQrDataUrl = '';
    if (process.env.UPI_ID) {
        try {
            const upiId = process.env.UPI_ID;
            const { qrCodeImage } = await generateUpiQr(upiId, balanceAmount > 0 ? balanceAmount.toFixed(2) : null);
            upiQrDataUrl = qrCodeImage;
        } catch (error) {
            console.error(`[PDF] Failed to generate UPI QR code:`, error);
        }
    }

    html = html.replace(/{{bankName}}/g, 'INDIAN OVERSEAS BANK, B RDWAY');
    html = html.replace(/{{bankAccount}}/g, '130702000003546');
    html = html.replace(/{{bankIFSC}}/g, 'IOBA0001307');
    html = html.replace(/{{bankHolder}}/g, 'Shaikh Tools And Dies');
    html = html.replace(/{{upiQrImage}}/g, upiQrDataUrl);
    html = html.replace(/{{signatureImage}}/g, 'https://bri.ct.ws/include/sign.png');

    return html;
}

function convertToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero Rupees Only';

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
