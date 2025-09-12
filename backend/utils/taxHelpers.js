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

function calculateItemTaxes(item, customerState) {
    const customerStateCode = extractStateCode(customerState);
    const isInterState = customerStateCode && customerStateCode !== COMPANY_STATE_CODE;

    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate ?? item.price ?? 0);
    const taxRate = Number(item.taxSlab ?? item.taxRate ?? 0);
    const discountPct = Number(item.discount || 0);

    if (qty <= 0 || GST_RATES[taxRate] === undefined) {
        return { igst: 0, cgst: 0, sgst: 0, taxableValue: 0 };
    }

    const priceType = (item.priceType || item.price_type || 'Exclusive');
    const unitTaxable = (String(priceType) === 'Inclusive')
        ? (rate / (1 + taxRate / 100))
        : rate;

    const baseAmount = unitTaxable * qty;
    const discountAmount = (baseAmount * (discountPct || 0)) / 100;
    const taxableValue = Math.max(0, baseAmount - discountAmount);

    const tax = (taxableValue * taxRate) / 100;

    let igst = 0, cgst = 0, sgst = 0;
    if (isInterState) {
        igst = tax;
    } else {
        cgst = tax / 2;
        sgst = tax / 2;
    }

    return {
        igst: Math.round(igst * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        taxableValue: Math.round(taxableValue * 100) / 100
    };
}

const calculateTotals = (items, customerState) => {
    let subTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    items.forEach((item) => {
        const { igst, cgst, sgst, taxableValue } = calculateItemTaxes(item, customerState);
        subTotal += taxableValue;
        totalIgst += igst;
        totalCgst += cgst;
        totalSgst += sgst;
    });

    const taxAmount = {
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        igst: Math.round(totalIgst * 100) / 100,
    };

    const totalAmount = subTotal + totalCgst + totalSgst + totalIgst;

    return { subTotal, taxAmount, totalAmount };
};

module.exports = { calculateTotals, calculateItemTaxes, extractStateCode, COMPANY_STATE_CODE, COMPANY_STATE_NAME };
