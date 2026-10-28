export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

export const BILLING_TONES = {
  draft: 'bg-silver text-slate',
  sent: 'bg-sky text-navy',
  accepted: 'bg-slate text-ice',
  declined: 'bg-silver/70 text-slate',
  partially_paid: 'bg-sky/60 text-navy',
  paid: 'bg-slate text-ice',
  void: 'bg-silver/70 text-slate line-through',
  overdue: 'bg-[#f3d9d5] text-[#8a2f25]',
  expired: 'bg-silver/70 text-slate',
}

export function formatCents(cents, currency = 'USD') {
  const value = (Number(cents) || 0) / 100
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function toCents(value) {
  const number = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(number) ? Math.round(number * 100) : 0
}

export function computeTotals(items, discount, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * toCents(item.unit_price)), 0)
  const discountCents = Math.min(Math.max(0, toCents(discount)), subtotal)
  const taxable = subtotal - discountCents
  const tax = Math.round((taxable * (Number(taxRate) || 0)) / 100)
  return { subtotal, discount: discountCents, tax, total: taxable + tax }
}

export function longDate(value) {
  if (!value) return ''
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function addDays(days, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + Number(days || 0))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function printDocument() {
  window.print()
}
