const GST_RATES = {
    0: 0,
    3: 3,
    5: 5,
    12: 12,
    18: 18,
    28: 28,
};

const calculateTotals = (items, customerState, billingState = 'MH') => {
    let subTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const isInterState = customerState !== billingState;

    items.forEach((item) => {
        const itemTotal = (item.rate || item.price) * item.quantity;
        subTotal += itemTotal;

        const taxRate = item.taxSlab || 0;
        if (GST_RATES[taxRate] === undefined) {
            // Silently ignore invalid tax slabs for now
            return;
        }

        const tax = (itemTotal * taxRate) / 100;

        if (isInterState) {
            totalIgst += tax;
        } else {
            totalCgst += tax / 2;
            totalSgst += tax / 2;
        }
    });

    const taxAmount = {
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
    };

    const totalAmount = subTotal + totalCgst + totalSgst + totalIgst;

    return { subTotal, taxAmount, totalAmount };
};

module.exports = { calculateTotals };