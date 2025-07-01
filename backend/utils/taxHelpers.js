export const calculateTax = (items, customerState, billingState) => {
    return items.map(item => {
        const taxableAmount = item.price * item.quantity;
        const taxRate = item.taxSlab;
        const isInterState = customerState !== billingState;

        if (isInterState) {
            const igst = (taxableAmount * taxRate) / 100;
            return { ...item, igst, cgst: 0, sgst: 0 };
        } else {
            const cgst = (taxableAmount * taxRate) / 200;
            const sgst = (taxableAmount * taxRate) / 200;
            return { ...item, igst: 0, cgst, sgst };
        }
    });
};