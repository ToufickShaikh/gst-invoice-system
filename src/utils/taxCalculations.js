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
  // Compute per-item taxable amounts while respecting priceType (Inclusive/Exclusive)
  let subtotal = 0
  let totalTax = 0

  for (const item of items) {
    const qty = Number(item.quantity || 0) || 0
    const price = Number(item.price || item.rate || 0) || 0
    const taxSlab = Number(item.taxSlab || item.taxRate || 0) || 0
    const priceType = item.priceType || 'Exclusive'

    // Raw line amount before discount
    const rawLineAmount = price * qty

    // Proportional discount for this line (discount is percent over subtotal in previous impl)
    // We'll compute discount later after determining subtotal base; for simplicity, apply item-level discount if provided
    const itemLevelDiscountPct = Number(item.discount || 0) || 0

    // Derive taxable base depending on priceType. For Inclusive, remove tax from the given price.
    let unitTaxable
    if (String(priceType) === 'Inclusive' && taxSlab) {
      unitTaxable = price / (1 + taxSlab / 100)
    } else {
      unitTaxable = price
    }

    const lineTaxableBeforeItemDiscount = unitTaxable * qty
    const itemDiscountAmount = (lineTaxableBeforeItemDiscount * itemLevelDiscountPct) / 100
    const lineTaxable = lineTaxableBeforeItemDiscount - itemDiscountAmount

    const taxObj = calculateTax(lineTaxable, taxSlab)
    const lineTax = taxObj.total

    subtotal += lineTaxable
    totalTax += lineTax
  }

  // Apply global discount (percentage) on subtotal if provided (keeps legacy behavior)
  const discountAmount = (subtotal * (Number(discount) || 0)) / 100
  const taxableAmount = subtotal - discountAmount

  // If global discount applied, reduce totalTax proportionally
  const totalTaxAfterGlobalDiscount = totalTax * (taxableAmount / (subtotal || 1))

  return {
    subtotal,
    discount: discountAmount,
    taxableAmount,
    totalTax: totalTaxAfterGlobalDiscount,
    grandTotal: taxableAmount + totalTaxAfterGlobalDiscount
  }
}