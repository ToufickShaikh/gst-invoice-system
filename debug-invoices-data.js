// Debug script to check invoices and their data structure
import axios from 'axios';

const API_BASE_URL = 'https://gst-invoice-system-back.onrender.com/api';

async function checkInvoicesData() {
    console.log('🔍 Checking Invoices Data Structure...\n');

    try {
        // Get all invoices
        const invoicesResponse = await axios.get(`${API_BASE_URL}/billing/invoices`);
        console.log('✅ Total invoices found:', invoicesResponse.data.length);

        if (invoicesResponse.data.length > 0) {
            console.log('\n📄 First invoice sample:');
            const firstInvoice = invoicesResponse.data[0];
            console.log(JSON.stringify(firstInvoice, null, 2));

            console.log('\n📊 Invoice field analysis:');
            console.log('- Has createdAt?', !!firstInvoice.createdAt);
            console.log('- createdAt value:', firstInvoice.createdAt);
            console.log('- createdAt type:', typeof firstInvoice.createdAt);
            console.log('- Has grandTotal?', !!firstInvoice.grandTotal);
            console.log('- grandTotal value:', firstInvoice.grandTotal);
            console.log('- grandTotal type:', typeof firstInvoice.grandTotal);
            console.log('- Has paidAmount?', !!firstInvoice.paidAmount);
            console.log('- paidAmount value:', firstInvoice.paidAmount);
            console.log('- paidAmount type:', typeof firstInvoice.paidAmount);

            // Check all invoices for data patterns
            console.log('\n📈 All invoices summary:');
            invoicesResponse.data.forEach((invoice, index) => {
                console.log(`Invoice ${index + 1}: grandTotal=${invoice.grandTotal}, paidAmount=${invoice.paidAmount}, createdAt=${invoice.createdAt}`);
            });

            // Test date filtering manually
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            console.log('\n📅 Date range for testing:');
            console.log('- Start date:', firstDayOfMonth.toISOString().split('T')[0]);
            console.log('- End date:', today.toISOString().split('T')[0]);

            // Check which invoices fall in the current month
            const currentMonthInvoices = invoicesResponse.data.filter(invoice => {
                const invoiceDate = new Date(invoice.createdAt);
                return invoiceDate >= firstDayOfMonth && invoiceDate <= today;
            });

            console.log('- Invoices in current month:', currentMonthInvoices.length);
            if (currentMonthInvoices.length > 0) {
                console.log('- Current month invoices:', currentMonthInvoices.map(inv => ({
                    id: inv._id,
                    date: inv.createdAt,
                    grandTotal: inv.grandTotal,
                    paidAmount: inv.paidAmount
                })));
            }
        } else {
            console.log('❌ No invoices found in the database');
        }

    } catch (error) {
        console.error('❌ Error checking invoices:');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

checkInvoicesData();
