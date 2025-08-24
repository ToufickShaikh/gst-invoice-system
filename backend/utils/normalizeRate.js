// Utility to convert entered rates to canonical exclusive rate
function normalizeRate({ rate = 0, taxSlab = 0, inputType = 'Exclusive' } = {}) {
  const r = Number(rate) || 0
  const tax = Number(taxSlab) || 0
  if (inputType === 'Inclusive' && tax > 0) {
    return Number((r / (1 + tax / 100)).toFixed(2))
  }
  return Number(r.toFixed(2))
}

module.exports = normalizeRate
