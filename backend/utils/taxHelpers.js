const GST_RATES = {
    0: 0,
    3: 3,
    5: 5,
    12: 12,
    18: 18,
    28: 28,
};

const company = require('../config/company');

// Company's state code and name derived from config (default Tamil Nadu 33)
const COMPANY_STATE_CODE = (company.state && String(company.state).split('-')[0].trim()) || '33';
const COMPANY_STATE_NAME = (company.state && String(company.state).split('-')[1]) || 'Tamil Nadu';

/**
 * Extract state code from formatted state string (e.g., "33-Tamil Nadu" -> "33")
 */
function extractStateCode(stateString) {
    if (!stateString) return null;

    // Handle different formats
    if (stateString.includes('-')) {
        return stateString.split('-')[0].trim();
    }

    // If it's just a number, return as is
    if (/^\d{2}$/.test(stateString)) {
        return stateString;
    }

    // If it's a state name, try to find the code
    const stateMapping = {
        'Tamil Nadu': '33',
        'Maharashtra': '27',
        'Karnataka': '29',
        'Kerala': '32',
        'Andhra Pradesh': '28',
        'Telangana': '36',
        'Gujarat': '24',
        'Rajasthan': '08',
        'Uttar Pradesh': '09',
        'West Bengal': '19',
        'Delhi': '07',
        'Haryana': '06',
        'Punjab': '03'
    };

    return stateMapping[stateString] || null;
}

const calculateTotals = (items, customerState) => {
    let subTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    console.log('[TAX CALC] Calculating taxes...');
    console.log('[TAX CALC] Company State Code:', COMPANY_STATE_CODE, `(${COMPANY_STATE_NAME})`);
    console.log('[TAX CALC] Customer State:', customerState);

    // Extract customer state code
    const customerStateCode = extractStateCode(customerState);
    console.log('[TAX CALC] Customer State Code:', customerStateCode);

    // Determine if it's inter-state transaction
    const isInterState = customerStateCode && customerStateCode !== COMPANY_STATE_CODE;
    console.log('[TAX CALC] Is Inter-State Transaction:', isInterState);

    if (isInterState) {
        console.log('[TAX CALC] Applying IGST (Inter-state transaction)');
    } else {
        console.log('[TAX CALC] Applying CGST + SGST (Intra-state transaction)');
    }

    items.forEach((item, index) => {
        const itemTotal = (item.rate || item.price) * item.quantity;
        subTotal += itemTotal;

        const taxRate = item.taxSlab || 0;
        if (GST_RATES[taxRate] === undefined) {
            console.log(`[TAX CALC] Invalid tax slab for item ${index + 1}:`, taxRate);
            return;
        }

        const tax = (itemTotal * taxRate) / 100;
        console.log(`[TAX CALC] Item ${index + 1}: Total=${itemTotal}, TaxRate=${taxRate}%, Tax=${tax}`);

        if (isInterState) {
            totalIgst += tax;
            console.log(`[TAX CALC] Added to IGST: ${tax}, Total IGST: ${totalIgst}`);
        } else {
            const cgst = tax / 2;
            const sgst = tax / 2;
            totalCgst += cgst;
            totalSgst += sgst;
            console.log(`[TAX CALC] Added CGST: ${cgst}, SGST: ${sgst}, Total CGST: ${totalCgst}, Total SGST: ${totalSgst}`);
        }
    });

    const taxAmount = {
        cgst: Math.round(totalCgst * 100) / 100, // Round to 2 decimal places
        sgst: Math.round(totalSgst * 100) / 100,
        igst: Math.round(totalIgst * 100) / 100,
    };

    const totalAmount = subTotal + totalCgst + totalSgst + totalIgst;

    console.log('[TAX CALC] Final Tax Calculation:');
    console.log('[TAX CALC] Sub Total:', subTotal);
    console.log('[TAX CALC] CGST:', taxAmount.cgst);
    console.log('[TAX CALC] SGST:', taxAmount.sgst);
    console.log('[TAX CALC] IGST:', taxAmount.igst);
    console.log('[TAX CALC] Total Amount:', totalAmount);

    return { subTotal, taxAmount, totalAmount };
};

module.exports = { calculateTotals, extractStateCode, COMPANY_STATE_CODE, COMPANY_STATE_NAME };