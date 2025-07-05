const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');

async function generateInvoicePDF(invoiceData) {
    try {
        const templatePath = path.resolve(__dirname, '../templates/invoiceTemplate.html');
        let html = await fs.readFile(templatePath, 'utf-8');

        // Company details
        html = html.replace(/{{companyName}}/g, 'Shaikh Tools And Dies');
        html = html.replace(/{{companyAddress}}/g, 'NO.11/44 EDAPALLAM STREET PARK TOWN');
        html = html.replace(/{{companyPhone}}/g, '8939487096');
        html = html.replace(/{{companyEmail}}/g, 'shaikhtoolsanddies@yahoo.com');
        html = html.replace(/{{companyGSTIN}}/g, '33BVRPS2849Q1ZH');
        html = html.replace(/{{companyState}}/g, '33-Tamil Nadu');
        html = html.replace(/{{companyLogo}}/g, ''); // Add logo path if available

        // Customer details
        const customer = invoiceData.customer;
        html = html.replace(/{{customerName}}/g, customer?.firmName || customer?.name || '');
        html = html.replace(/{{customerAddress}}/g, customer?.firmAddress || '');
        html = html.replace(/{{customerPhone}}/g, customer?.contact || '');
        html = html.replace(/{{customerGSTIN}}/g, customer?.gstNo || '');
        html = html.replace(/{{customerState}}/g, customer?.state || '33-Tamil Nadu');

        // Invoice details
        html = html.replace(/{{invoiceNumber}}/g, invoiceData.invoiceNumber || '');
        html = html.replace(/{{invoiceDate}}/g, new Date(invoiceData.invoiceDate || Date.now()).toLocaleDateString('en-GB'));
        html = html.replace(/{{placeOfSupply}}/g, customer?.state || '33-Tamil Nadu');

        // Calculate totals and prepare items data
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

                const itemTotal = rate * quantity;
                const gstAmount = (itemTotal * taxSlab) / 100;
                const totalWithGst = itemTotal + gstAmount;

                totalQuantity += quantity;
                totalGST += gstAmount;

                // Add to tax summary
                if (!taxSummary[hsnCode]) {
                    taxSummary[hsnCode] = {
                        hsnCode,
                        taxableAmount: 0,
                        cgstRate: taxSlab / 2,
                        sgstRate: taxSlab / 2,
                        cgstAmount: 0,
                        sgstAmount: 0,
                        totalTax: 0
                    };
                }
                taxSummary[hsnCode].taxableAmount += itemTotal;
                taxSummary[hsnCode].cgstAmount += gstAmount / 2;
                taxSummary[hsnCode].sgstAmount += gstAmount / 2;
                taxSummary[hsnCode].totalTax += gstAmount;

                itemsHtml += `
                <tr>
                    <td class="center">${index + 1}</td>
                    <td>${itemName}</td>
                    <td class="center">${hsnCode}</td>
                    <td class="center">${quantity}</td>
                    <td class="right">₹ ${rate.toFixed(2)}</td>
                    <td class="right">₹ ${gstAmount.toFixed(2)} (${taxSlab}%)</td>
                    <td class="right">₹ ${totalWithGst.toFixed(2)}</td>
                </tr>`;
            });
        }

        // Replace items table
        html = html.replace(/{{itemsTable}}/g, itemsHtml);

        // Replace totals
        html = html.replace(/{{totalQuantity}}/g, totalQuantity);
        html = html.replace(/{{totalGST}}/g, totalGST.toFixed(2));
        html = html.replace(/{{totalAmount}}/g, (invoiceData.totalAmount || invoiceData.grandTotal || 0).toFixed(2));
        html = html.replace(/{{subTotal}}/g, (invoiceData.subTotal || 0).toFixed(2));

        // Generate tax summary HTML
        let taxSummaryHtml = '';
        let taxSummaryTotals = { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, totalTax: 0 };

        Object.values(taxSummary).forEach(tax => {
            taxSummaryTotals.taxableAmount += tax.taxableAmount;
            taxSummaryTotals.cgstAmount += tax.cgstAmount;
            taxSummaryTotals.sgstAmount += tax.sgstAmount;
            taxSummaryTotals.totalTax += tax.totalTax;

            taxSummaryHtml += `
            <tr>
                <td>${tax.hsnCode}</td>
                <td class="right">${tax.taxableAmount.toFixed(2)}</td>
                <td class="center">${tax.cgstRate}</td>
                <td class="right">${tax.cgstAmount.toFixed(2)}</td>
                <td class="center">${tax.sgstRate}</td>
                <td class="right">${tax.sgstAmount.toFixed(2)}</td>
                <td class="right">${tax.totalTax.toFixed(2)}</td>
            </tr>`;
        });

        html = html.replace(/{{taxSummaryTable}}/g, taxSummaryHtml);
        html = html.replace(/{{taxSummaryTotal\.taxableAmount}}/g, taxSummaryTotals.taxableAmount.toFixed(2));
        html = html.replace(/{{taxSummaryTotal\.cgstAmount}}/g, taxSummaryTotals.cgstAmount.toFixed(2));
        html = html.replace(/{{taxSummaryTotal\.sgstAmount}}/g, taxSummaryTotals.sgstAmount.toFixed(2));
        html = html.replace(/{{taxSummaryTotal\.totalTax}}/g, taxSummaryTotals.totalTax.toFixed(2));

        // Amount in words (simplified)
        const amountInWords = convertToWords(invoiceData.totalAmount || invoiceData.grandTotal || 0);
        html = html.replace(/{{amountInWords}}/g, amountInWords);

        // Payment details
        html = html.replace(/{{receivedAmount}}/g, (invoiceData.paidAmount || 0).toFixed(2));
        html = html.replace(/{{balanceAmount}}/g, (invoiceData.balance || (invoiceData.totalAmount || invoiceData.grandTotal || 0) - (invoiceData.paidAmount || 0)).toFixed(2));

        // Bank details
        html = html.replace(/{{bankName}}/g, 'INDIAN OVERSEAS BANK, B RDWAY');
        html = html.replace(/{{bankAccount}}/g, '130702000003546');
        html = html.replace(/{{bankIFSC}}/g, 'IOBA0001307');
        html = html.replace(/{{bankHolder}}/g, 'Shaikh Tools And Dies');
        html = html.replace(/{{upiQrImage}}/g, ''); // Add QR image path if available
        html = html.replace(/{{signatureImage}}/g, ''); // Add signature image path if available

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(pdfDir, { recursive: true });
        const pdfPath = path.join(pdfDir, `invoice-${invoiceData.invoiceNumber}.pdf`);

        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });

        await browser.close();
        console.log(`[SUCCESS] PDF generated for invoice ${invoiceData.invoiceNumber} at ${pdfPath}`);
        return `/invoices/invoice-${invoiceData.invoiceNumber}.pdf`;
    } catch (error) {
        console.error(`[ERROR] Failed to generate PDF for invoice ${invoiceData.invoiceNumber}:`, error);
        throw new Error('PDF generation failed.');
    }
}

// Helper function to convert number to words
function convertToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero Rupees Only';

    const amount = Math.floor(num);
    let words = '';

    function convertHundreds(n) {
        let result = '';
        if (n > 99) {
            result += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            result += teens[n - 10] + ' ';
            return result;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }
        return result;
    }

    if (amount >= 10000000) {
        words += convertHundreds(Math.floor(amount / 10000000)) + 'Crore ';
        amount %= 10000000;
    }
    if (amount >= 100000) {
        words += convertHundreds(Math.floor(amount / 100000)) + 'Lakh ';
        amount %= 100000;
    }
    if (amount >= 1000) {
        words += convertHundreds(Math.floor(amount / 1000)) + 'Thousand ';
        amount %= 1000;
    }
    if (amount > 0) {
        words += convertHundreds(amount);
    }

    return words.trim() + ' Rupees Only';
}

module.exports = { generateInvoicePDF };