// Test billing calculations
console.log('🧮 TESTING BILLING CALCULATIONS');
console.log('==============================');

// Mock data to test calculations
const mockItems = [
    {
        _id: '1',
        name: 'Steel Die',
        rate: 1000,
        taxSlab: 18,
        unit: 'pcs'
    },
    {
        _id: '2',
        name: 'Aluminum Sheet',
        rate: 500,
        taxSlab: 12,
        unit: 'kg'
    }
];

const mockBillItems = [
    {
        id: 1,
        itemId: '1',
        quantity: 2,
        item: mockItems[0]
    },
    {
        id: 2,
        itemId: '2',
        quantity: 3,
        item: mockItems[1]
    }
];

// Test calculateTax function
const calculateTax = (amount, taxRate, isInterState = false) => {
    const validAmount = Number(amount) || 0
    const validTaxRate = Number(taxRate) || 0

    const taxAmount = (validAmount * validTaxRate) / 100

    if (isInterState) {
        return {
            igst: taxAmount,
            cgst: 0,
            sgst: 0,
            total: taxAmount
        }
    } else {
        const halfTax = taxAmount / 2
        return {
            igst: 0,
            cgst: halfTax,
            sgst: halfTax,
            total: taxAmount
        }
    }
}

// Test getBillItemsWithTax logic
const getBillItemsWithTax = (billItems, discountAmt = 0, isInterState = false) => {
    // Calculate total before discount for all items
    const totalBeforeDiscount = billItems.reduce((sum, billItem) => {
        if (!billItem.item) return sum
        const rate = Number(billItem.item.rate) || 0
        const quantity = Number(billItem.quantity) || 0
        return sum + (rate * quantity)
    }, 0)

    console.log('Total before discount:', totalBeforeDiscount);

    // Distribute discount amount proportionally to each item
    return billItems.map(billItem => {
        if (!billItem.item) return null

        const rate = Number(billItem.item.rate) || 0
        const quantity = Number(billItem.quantity) || 0
        const taxSlab = Number(billItem.item.taxSlab) || 0

        const itemTotal = rate * quantity
        const discountAmount = totalBeforeDiscount > 0 ? (itemTotal / totalBeforeDiscount) * Number(discountAmt || 0) : 0
        const taxableAmount = itemTotal - discountAmount
        const tax = calculateTax(taxableAmount, taxSlab, isInterState)

        console.log(`Item: ${billItem.item.name}`);
        console.log(`  Rate: ${rate}, Quantity: ${quantity}`);
        console.log(`  Item Total: ${itemTotal}`);
        console.log(`  Discount: ${discountAmount}`);
        console.log(`  Taxable: ${taxableAmount}`);
        console.log(`  Tax: ${JSON.stringify(tax)}`);

        return {
            ...billItem,
            itemTotal,
            discountAmount,
            taxableAmount,
            tax,
            totalWithTax: taxableAmount + (tax ? tax.total : 0)
        }
    }).filter(Boolean)
}

// Run test
console.log('\n📊 Testing with mock data:');
const billItemsWithTax = getBillItemsWithTax(mockBillItems, 100);

const totalBeforeTax = billItemsWithTax.reduce((sum, item) => {
    const taxableAmount = Number(item?.taxableAmount) || 0
    return sum + taxableAmount
}, 0)

const totalTax = billItemsWithTax.reduce((sum, item) => {
    const taxTotal = Number(item?.tax?.total) || 0
    return sum + taxTotal
}, 0)

const shippingCharges = 50;
const grandTotal = totalBeforeTax + totalTax + Number(shippingCharges || 0)

console.log('\n💰 Final Calculations:');
console.log('Total Before Tax:', totalBeforeTax);
console.log('Total Tax:', totalTax);
console.log('Shipping:', shippingCharges);
console.log('Grand Total:', grandTotal);

// Test edge cases
console.log('\n⚠️  Testing edge cases:');
console.log('Empty item:', calculateTax(0, 18));
console.log('NaN rate:', calculateTax(NaN, 18));
console.log('Undefined rate:', calculateTax(undefined, 18));
console.log('String values:', calculateTax('100', '18'));

console.log('\n✅ Calculation test complete!');
