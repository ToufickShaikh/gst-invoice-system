export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatCurrency = (amount) => {
  const validAmount = Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(validAmount)
}