import { useMemo } from 'react';

export const usePOSCalculations = (saleItems, discount) => {
  return useMemo(() => {
    const totalBase = saleItems.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0) || 0;

    const totals = saleItems.reduce((acc, it) => {
      const lineBase = Number(it.price || 0) * Number(it.quantity || 0);
      const tax = Number(it.taxSlab || 0) || 0;
      const propDiscount = totalBase > 0 ? (lineBase / totalBase) * Number(discount || 0) : 0;
      const priceType = String(it.priceType ?? it.item?.priceType ?? 'Exclusive');

      if (priceType === 'Inclusive' && tax) {
        const discountedInclusive = Math.max(0, lineBase - propDiscount);
        const taxable = discountedInclusive / (1 + tax / 100);
        const taxAmt = Math.max(0, discountedInclusive - taxable);
        const lineTotal = discountedInclusive;
        acc.subtotal += taxable;
        acc.tax += taxAmt;
        acc.grand += lineTotal;
      } else {
        const taxable = Math.max(0, lineBase - propDiscount);
        const taxAmt = taxable * (tax / 100);
        const lineTotal = taxable + taxAmt;
        acc.subtotal += taxable;
        acc.tax += taxAmt;
        acc.grand += lineTotal;
      }
      return acc;
    }, { subtotal: 0, tax: 0, grand: 0 });

    return {
      subtotal: totals.subtotal,
      totalTax: totals.tax,
      grandTotal: totals.grand,
      totalBase
    };
  }, [saleItems, discount]);
};