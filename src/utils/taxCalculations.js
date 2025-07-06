export const calculateTax = (amount, taxRate, isInterState = false) => {
  // Ensure inputs are valid numbers
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

export const calculateTotal = (items, discount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0)

  const discountAmount = (subtotal * discount) / 100
  const taxableAmount = subtotal - discountAmount

  const totalTax = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity
    const itemDiscount = (itemTotal * discount) / 100
    const itemTaxable = itemTotal - itemDiscount
    const tax = calculateTax(itemTaxable, item.taxSlab)
    return sum + tax.total
  }, 0)

  return {
    subtotal,
    discount: discountAmount,
    taxableAmount,
    totalTax,
    grandTotal: taxableAmount + totalTax
  }
}