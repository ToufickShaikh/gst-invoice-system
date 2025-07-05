const { generateInvoicePDF } = require('./utils/pdfGenerator');
const path = require('path');

// Test invoice generation with the new template
async function testInvoiceGeneration() {
    try {
        console.log('🧪 Testing invoice generation with new template...');

        const invoiceData = {
            invoiceNumber: 'INV-TEST-001',
            invoiceDate: '2024-01-15',
            dueDate: '2024-02-14',
            placeOfSupply: 'Tamil Nadu',
            paymentStatus: 'Pending',

            // Company details
            companyName: 'Test Company Pvt Ltd',
            companyAddress: '123 Test Street, Chennai, Tamil Nadu 600001',
            companyPhone: '+91 9876543210',
            companyEmail: 'test@company.com',
            companyGSTIN: '33AABCT1234C1Z5',
            companyState: 'Tamil Nadu',
            companyLogo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzQ0OTVlIi8+Cjx0ZXh0IHg9IjIwIiB5PSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiPlQ8L3RleHQ+Cjwvc3ZnPgo=',

            // Customer details
            customerName: 'Test Customer Ltd',
            customerAddress: '456 Customer Lane, Mumbai, Maharashtra 400001',
            customerPhone: '+91 9876543211',
            customerEmail: 'customer@test.com',
            customerGSTIN: '27AABCT1234C1Z5',
            customerState: 'Maharashtra',

            // Items
            items: [
                {
                    name: 'Test Product 1',
                    hsnSac: '1234',
                    quantity: 2,
                    units: 'per piece',
                    rate: 1000,
                    gstRate: 18,
                    amount: 2000
                },
                {
                    name: 'Test Service 1',
                    hsnSac: '9987',
                    quantity: 1,
                    units: 'per sqft',
                    rate: 500,
                    gstRate: 18,
                    amount: 500
                }
            ],

            // Calculations
            subTotal: 2500,
            totalGST: 450,
            totalAmount: 2950,
            receivedAmount: 0,
            balanceAmount: 2950,
            totalQuantity: 3,
            amountInWords: 'Two Thousand Nine Hundred And Fifty Rupees Only',

            // Tax summary
            taxSummaryTotal: {
                taxableAmount: 2500,
                igstAmount: 450,
                cgstAmount: 0,
                sgstAmount: 0,
                totalTax: 450
            },

            // Bank details
            bankName: 'Test Bank',
            bankAccount: '1234567890',
            bankIFSC: 'TEST0001234',
            bankHolder: 'Test Company Pvt Ltd',
            upiQrImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPHRLEHER0YW5jaG9yPSJtaWRkbGUiIGZpbGw9ImJsYWNrIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiPlFSPC90ZXh0Pgo8L3N2Zz4K',
            signatureImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTIwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTAgMjVDMjAgMTUgNDAgMzUgNjAgMjBDODAgMzUgMTAwIDE1IDExMCAyNSIgc3Ryb2tlPSIjMzQ0OTVlIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPC9zdmc+Cg=='
        };

        // Generate items table HTML
        const itemsTableHtml = invoiceData.items.map((item, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-left">${item.name}</td>
                    <td>${item.hsnSac}</td>
                    <td>${item.quantity}</td>
                    <td>${item.units}</td>
                    <td class="text-right">₹${item.rate.toFixed(2)}</td>
                    <td>${item.gstRate}%</td>
                    <td class="text-right">₹${item.amount.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Generate tax summary table HTML
        const taxSummaryTableHtml = `
            <tr>
                <td class="text-left">1234, 9987</td>
                <td class="text-right">₹${invoiceData.taxSummaryTotal.taxableAmount.toFixed(2)}</td>
                <td>18%</td>
                <td class="text-right">₹${invoiceData.taxSummaryTotal.igstAmount.toFixed(2)}</td>
                <td>-</td>
                <td class="text-right">₹${invoiceData.taxSummaryTotal.cgstAmount.toFixed(2)}</td>
                <td>-</td>
                <td class="text-right">₹${invoiceData.taxSummaryTotal.sgstAmount.toFixed(2)}</td>
                <td class="text-right">₹${invoiceData.taxSummaryTotal.totalTax.toFixed(2)}</td>
            </tr>
        `;

        // Add generated HTML to invoice data
        invoiceData.itemsTable = itemsTableHtml;
        invoiceData.taxSummaryTable = taxSummaryTableHtml;

        // Generate PDF
        const pdfPath = await generateInvoicePDF(invoiceData);

        console.log('✅ PDF generated successfully!');
        console.log('📄 PDF saved at:', pdfPath);
        console.log('🎨 New professional Tally-style template applied');
        console.log('✨ Template test completed successfully!');

    } catch (error) {
        console.error('❌ Invoice generation test failed:', error.message);
        console.error(error.stack);
    }
}

testInvoiceGeneration();
