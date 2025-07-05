const { generateInvoicePDF } = require('./utils/pdfGenerator');

// Test final invoice generation with new gold and black styling
async function testFinalInvoice() {
    try {
        console.log('🏆 Testing final invoice generation with premium gold & black theme...');

        const invoiceData = {
            invoiceNumber: 'INV-GOLD-001',
            invoiceDate: '2025-01-15',
            dueDate: '2025-02-14',
            placeOfSupply: 'Tamil Nadu',
            paymentStatus: 'Pending',

            // Company details
            companyName: 'Premium Solutions Pvt Ltd',
            companyAddress: '123 Golden Tower, Anna Salai, Chennai, Tamil Nadu 600002',
            companyPhone: '+91 9876543210',
            companyEmail: 'info@premiumsolutions.com',
            companyGSTIN: '33AABCT1234C1Z5',
            companyState: 'Tamil Nadu',
            companyLogo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMmMyYzJjIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMjUiIHI9IjE1IiBzdHJva2U9IiNEQUE1MjAiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8dGV4dCB4PSIyNSIgeT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNEQUE1MjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiPlA8L3RleHQ+Cjwvc3ZnPgo=',

            // Customer details
            customerName: 'Luxury Retail Ltd',
            customerAddress: '456 Business District, Bandra West, Mumbai, Maharashtra 400050',
            customerPhone: '+91 9876543211',
            customerEmail: 'orders@luxuryretail.com',
            customerGSTIN: '27AABCT1234C1Z5',
            customerState: 'Maharashtra',

            // Items with units
            items: [
                {
                    name: 'Premium Software License',
                    hsnSac: '9983',
                    quantity: 5,
                    units: 'per piece',
                    rate: 2500,
                    gstRate: 18,
                    amount: 12500
                },
                {
                    name: 'Installation Service',
                    hsnSac: '9987',
                    quantity: 100,
                    units: 'per sqft',
                    rate: 150,
                    gstRate: 18,
                    amount: 15000
                },
                {
                    name: 'Training Package',
                    hsnSac: '9989',
                    quantity: 2,
                    units: 'per set',
                    rate: 5000,
                    gstRate: 18,
                    amount: 10000
                }
            ],

            // Calculations
            subTotal: 37500,
            totalGST: 6750,
            totalAmount: 44250,
            receivedAmount: 20000,
            balanceAmount: 24250,
            totalQuantity: 107,
            amountInWords: 'Forty Four Thousand Two Hundred And Fifty Rupees Only',

            // Tax summary (inter-state)
            taxSummaryTotal: {
                taxableAmount: 37500,
                igstAmount: 6750,
                cgstAmount: 0,
                sgstAmount: 0,
                totalTax: 6750
            },

            // Bank details
            bankName: 'HDFC Bank',
            bankAccount: '50100123456789',
            bankIFSC: 'HDFC0001234',
            bankHolder: 'Premium Solutions Pvt Ltd',
            upiQrImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCA3MCA3MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjREFBNTIwIiBzdHJva2Utd2lkdGg9IjMiLz4KPHRLEHRER0YW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMyYzJjMmMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiPlVQSTwvdGV4dD4KPHRLEERER0YW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNEQUE1MjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCI+UVI8L3RleHQ+Cjwvc3ZnPgo=',
            signatureImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMTAgMjBDMjAgMTAgNDAgMzAgNjAgMTVDODAgMzAgOTAgMTAgOTAgMjAiIHN0cm9rZT0iI0RBQTU0MCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik0xNSAyNUM0MCAyMCA2MCAyNSA4NSAyMCIgc3Ryb2tlPSIjMmMyYzJjIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPC9zdmc+Cg=='
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

        // Generate tax summary table HTML (inter-state IGST)
        const taxSummaryTableHtml = `
            <tr>
                <td class="text-left">9983, 9987, 9989</td>
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

        console.log('✅ Premium invoice generated successfully!');
        console.log('📄 PDF saved at:', pdfPath);
        console.log('🏆 Gold & Black premium theme applied');
        console.log('📱 Responsive design ready');
        console.log('📄 A4 optimized for printing');
        console.log('💰 Inter-state IGST tax calculation');
        console.log('📦 Units displayed properly');
        console.log('✨ Professional premium invoice ready!');

    } catch (error) {
        console.error('❌ Final invoice generation failed:', error.message);
        console.error(error.stack);
    }
}

testFinalInvoice();
