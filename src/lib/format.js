export const BUDGETS = [
  { value: 'under_500', label: 'Under 500' },
  { value: '500_2000', label: '500 to 2,000' },
  { value: '2000_5000', label: '2,000 to 5,000' },
  { value: '5000_15000', label: '5,000 to 15,000' },
  { value: 'over_15000', label: 'More than 15,000' },
  { value: 'not_sure', label: 'Not sure yet' },
]

export const TIMELINES = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_month', label: 'Within a month' },
  { value: '1_3_months', label: '1 to 3 months' },
  { value: '3_6_months', label: '3 to 6 months' },
  { value: 'flexible', label: 'I am flexible' },
]

export const ENGAGEMENTS = [
  { value: 'fixed', label: 'Fixed-price project', hint: 'One agreed price for a clear scope.' },
  { value: 'hourly', label: 'Hourly', hint: 'Pay for the hours worked, good for evolving work.' },
  { value: 'monthly', label: 'Monthly retainer', hint: 'A dedicated developer or team each month.' },
  { value: 'not_sure', label: 'Not sure', hint: 'We will recommend the best option.' },
]

export const AVAILABILITY = {
  available: { label: 'Available now', tone: 'bg-sky' },
  limited: { label: 'Limited availability', tone: 'bg-silver' },
  unavailable: { label: 'Fully booked', tone: 'bg-slate/40' },
}

export const STATUS_TONES = {
  new: 'bg-sky text-navy',
  in_review: 'bg-ice text-slate',
  awaiting_client: 'bg-silver text-slate',
  proposal_sent: 'bg-sky/60 text-navy',
  won: 'bg-slate text-ice',
  lost: 'bg-silver/70 text-slate',
  closed: 'bg-silver/70 text-slate',
}

export const labelOf = (list, value) => list.find((item) => item.value === value)?.label ?? value ?? ''

export function money(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return null
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export function priceLabel(service, currency) {
  if (service.starting_price === null || service.starting_price === undefined) return 'Custom quote'
  const unit = { project: '', hour: ' / hour', month: ' / month' }[service.price_unit] ?? ''
  return `From ${money(service.starting_price, currency)}${unit}`
}

export function dateTime(value) {
  return new Date(value).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })
}

export function shortDate(value) {
  return new Date(value).toLocaleDateString('en', { dateStyle: 'medium' })
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function whatsappLink(number, text) {
  const digits = String(number || '').replace(/[^0-9]/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function telLink(number) {
  const cleaned = String(number || '').replace(/[^0-9+]/g, '')
  return cleaned ? `tel:${cleaned}` : null
}
