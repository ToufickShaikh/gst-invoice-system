// Only require puppeteer when needed to avoid startup issues
const fs = require('fs/promises');
const path = require('path');
const { generateUpiQr } = require('./upiHelper');
const { extractStateCode, COMPANY_STATE_CODE } = require('./taxHelpers');

async function generateInvoicePDF(invoiceData) {
    console.log(`[PDF] Starting PDF generation for invoice: ${invoiceData.invoiceNumber}`);
    try {
        const templatePath = path.resolve(__dirname, '../templates/invoiceTemplate.html');
        console.log(`[PDF] Reading template from: ${templatePath}`);

        let html = await fs.readFile(templatePath, 'utf-8');
        console.log(`[PDF] Template loaded, size: ${html.length} characters`);

        // Company details
        html = html.replace(/{{companyName}}/g, 'Shaikh Tools And Dies');
        html = html.replace(/{{companyAddress}}/g, 'NO.11/44 EDAPALLAM STREET PARK TOWN');
        html = html.replace(/{{companyPhone}}/g, '8939487096');
        html = html.replace(/{{companyEmail}}/g, 'shaikhtoolsanddies@yahoo.com');
        html = html.replace(/{{companyGSTIN}}/g, '33BVRPS2849Q1ZH');
        html = html.replace(/{{companyState}}/g, '33-Tamil Nadu');
        html = html.replace(/{{companyLogo}}/g, 'https://shaikhtoolsanddies.com/filesforgst/logo.png');

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

        console.log(`[PDF] Basic placeholders replaced`);

        // Determine if it's inter-state transaction for proper tax calculation
        const customerStateCode = extractStateCode(customer?.state);
        const isInterState = customerStateCode && customerStateCode !== COMPANY_STATE_CODE;

        console.log(`[PDF] Tax calculation: Company State=${COMPANY_STATE_CODE}, Customer State=${customerStateCode}, Inter-State=${isInterState}`);

        // Calculate totals and prepare items data
        let totalQuantity = 0;
        let totalGST = 0;
        let itemsHtml = '';
        const taxSummary = {};

        if (invoiceData.items && invoiceData.items.length > 0) {
            console.log(`[PDF] Processing ${invoiceData.items.length} items`);
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

                // Add to tax summary with proper IGST/CGST+SGST logic
                if (!taxSummary[hsnCode]) {
                    if (isInterState) {
                        // Inter-state: Use IGST
                        taxSummary[hsnCode] = {
                            hsnCode,
                            taxableAmount: 0,
                            igstRate: taxSlab,
                            igstAmount: 0,
                            totalTax: 0,
                            isInterState: true
                        };
                    } else {
                        // Intra-state: Use CGST + SGST
                        taxSummary[hsnCode] = {
                            hsnCode,
                            taxableAmount: 0,
                            cgstRate: taxSlab / 2,
                            sgstRate: taxSlab / 2,
                            cgstAmount: 0,
                            sgstAmount: 0,
                            totalTax: 0,
                            isInterState: false
                        };
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

        console.log(`[PDF] Items processed, total GST: ${totalGST}, Inter-State: ${isInterState}`);

        // Replace items table
        html = html.replace(/{{itemsTable}}/g, itemsHtml);

        // Replace totals
        html = html.replace(/{{totalQuantity}}/g, totalQuantity);
        html = html.replace(/{{totalGST}}/g, totalGST.toFixed(2));
        html = html.replace(/{{totalAmount}}/g, (invoiceData.totalAmount || invoiceData.grandTotal || 0).toFixed(2));
        html = html.replace(/{{subTotal}}/g, (invoiceData.subTotal || 0).toFixed(2));

        // Generate tax summary HTML with proper IGST/CGST+SGST logic
        let taxSummaryHtml = '';
        let taxSummaryTotals = {
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalTax: 0
        };

        Object.values(taxSummary).forEach(tax => {
            taxSummaryTotals.taxableAmount += tax.taxableAmount;
            taxSummaryTotals.totalTax += tax.totalTax;

            if (tax.isInterState) {
                // Inter-state transaction: Show IGST
                taxSummaryTotals.igstAmount += tax.igstAmount;
                taxSummaryHtml += `
                <tr>
                    <td>${tax.hsnCode}</td>
                    <td class="right">${tax.taxableAmount.toFixed(2)}</td>
                    <td class="center">${tax.igstRate}%</td>
                    <td class="right">${tax.igstAmount.toFixed(2)}</td>
                    <td class="center">-</td>
                    <td class="right">-</td>
                    <td class="center">-</td>
                    <td class="right">-</td>
                    <td class="right">${tax.totalTax.toFixed(2)}</td>
                </tr>`;
            } else {
                // Intra-state transaction: Show CGST + SGST
                taxSummaryTotals.cgstAmount += tax.cgstAmount;
                taxSummaryTotals.sgstAmount += tax.sgstAmount;
                taxSummaryHtml += `
                <tr>
                    <td>${tax.hsnCode}</td>
                    <td class="right">${tax.taxableAmount.toFixed(2)}</td>
                    <td class="center">-</td>
                    <td class="right">-</td>
                    <td class="center">${tax.cgstRate}%</td>
                    <td class="right">${tax.cgstAmount.toFixed(2)}</td>
                    <td class="center">${tax.sgstRate}%</td>
                    <td class="right">${tax.sgstAmount.toFixed(2)}</td>
                    <td class="right">${tax.totalTax.toFixed(2)}</td>
                </tr>`;
            }
        });

        html = html.replace(/{{taxSummaryTable}}/g, taxSummaryHtml);
        html = html.replace(/{{taxSummaryTotal\.taxableAmount}}/g, taxSummaryTotals.taxableAmount.toFixed(2));

        // Replace tax totals based on transaction type
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

        console.log(`[PDF] Tax Summary: CGST=${taxSummaryTotals.cgstAmount.toFixed(2)}, SGST=${taxSummaryTotals.sgstAmount.toFixed(2)}, IGST=${taxSummaryTotals.igstAmount.toFixed(2)}, Inter-State=${isInterState}`);

        // Amount in words (simplified)
        const amountInWords = convertToWords(invoiceData.totalAmount || invoiceData.grandTotal || 0);
        html = html.replace(/{{amountInWords}}/g, amountInWords);

        // Payment details
        html = html.replace(/{{receivedAmount}}/g, (invoiceData.paidAmount || 0).toFixed(2));
        html = html.replace(/{{balanceAmount}}/g, (invoiceData.balance || (invoiceData.totalAmount || invoiceData.grandTotal || 0) - (invoiceData.paidAmount || 0)).toFixed(2));

        // Calculate balance amount for QR generation
        const balanceAmount = invoiceData.balance || (invoiceData.totalAmount || invoiceData.grandTotal || 0) - (invoiceData.paidAmount || 0);

        // Generate UPI QR code for balance amount if there's a balance
        let upiQrDataUrl = '';
        if (balanceAmount > 0) {
            try {
                const upiId = process.env.UPI_ID || 'shaikhtool@ibl';
                console.log(`[PDF] Generating UPI QR code for balance amount: ₹${balanceAmount.toFixed(2)}`);
                const { qrCodeImage } = await generateUpiQr(upiId, balanceAmount.toFixed(2));
                upiQrDataUrl = qrCodeImage;
                console.log(`[PDF] UPI QR code generated successfully`);
            } catch (error) {
                console.error(`[PDF] Failed to generate UPI QR code:`, error);
            }
        }

        // Bank details
        html = html.replace(/{{bankName}}/g, 'INDIAN OVERSEAS BANK, B RDWAY');
        html = html.replace(/{{bankAccount}}/g, '130702000003546');
        html = html.replace(/{{bankIFSC}}/g, 'IOBA0001307');
        html = html.replace(/{{bankHolder}}/g, 'Shaikh Tools And Dies');
        html = html.replace(/{{upiQrImage}}/g, upiQrDataUrl);
        html = html.replace(/{{signatureImage}}/g, 'https://shaikhtoolsanddies.com/filesforgst/Sign.png');

        console.log(`[PDF] All placeholders replaced, attempting PDF generation...`);

        // Create output directory
        const outputDir = path.resolve(__dirname, '../invoices');
        await fs.mkdir(outputDir, { recursive: true });

        // For now, save as HTML since Puppeteer might not work in production
        const htmlPath = path.join(outputDir, `invoice-${invoiceData.invoiceNumber}.html`);
        await fs.writeFile(htmlPath, html, 'utf-8');
        console.log(`[PDF] Invoice saved as HTML: ${htmlPath}`);

        // Schedule HTML file deletion after 30 seconds
        scheduleHtmlCleanup(htmlPath, invoiceData.invoiceNumber);

        // Try PDF generation with Puppeteer (with fallback)
        try {
            // Require puppeteer only when needed
            const puppeteer = require('puppeteer');

            const browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ],
                timeout: 30000
            });

            console.log(`[PDF] Browser launched successfully`);
            const page = await browser.newPage();
            await page.setViewport({ width: 1024, height: 768 });

            await page.setContent(html, {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            const pdfPath = path.join(outputDir, `invoice-${invoiceData.invoiceNumber}.pdf`);
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
                timeout: 20000
            });

            await browser.close();
            console.log(`[PDF] PDF generation completed successfully`);
            return `/invoices/invoice-${invoiceData.invoiceNumber}.pdf`;

        } catch (puppeteerError) {
            console.warn(`[PDF] Puppeteer failed, using HTML fallback:`, puppeteerError.message);
            // Return HTML path as fallback
            return `/invoices/invoice-${invoiceData.invoiceNumber}.html`;
        }
    } catch (error) {
        console.error(`[PDF] Failed to generate PDF for invoice ${invoiceData.invoiceNumber}:`, error);
        console.error(`[PDF] Error stack:`, error.stack);
        throw new Error(`PDF generation failed: ${error.message}`);
    }
}

// Helper function to convert number to words
function convertToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero Rupees Only';

    let amount = Math.floor(num);
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

// Helper function to schedule HTML file cleanup after 30 seconds
function scheduleHtmlCleanup(htmlPath, invoiceNumber) {
    setTimeout(async () => {
        try {
            await fs.unlink(htmlPath);
            console.log(`[CLEANUP] Successfully deleted HTML file for invoice ${invoiceNumber} after 30 seconds`);
        } catch (error) {
            // File might already be deleted or not exist - this is not critical
            if (error.code !== 'ENOENT') {
                console.warn(`[CLEANUP] Failed to delete HTML file for invoice ${invoiceNumber}:`, error.message);
            }
        }
    }, 30000); // 30 seconds = 30,000 milliseconds

    console.log(`[CLEANUP] Scheduled HTML cleanup for invoice ${invoiceNumber} in 30 seconds`);
}

module.exports = { generateInvoicePDF };