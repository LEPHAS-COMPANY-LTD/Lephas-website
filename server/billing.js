import { many, one } from './db.js'

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined']
export const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'void']
export const PAYMENT_METHODS = ['bank_transfer', 'mobile_money', 'card', 'cash', 'other']

export const BILLING_STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  void: 'Void',
  overdue: 'Overdue',
  expired: 'Expired',
}

export function lineAmount(quantity, unitPriceCents) {
  return Math.round(Number(quantity) * Number(unitPriceCents))
}

export function computeTotals(items, discountCents, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + lineAmount(item.quantity, item.unit_price_cents), 0)
  const discount = Math.min(Math.max(0, Number(discountCents) || 0), subtotal)
  const taxable = subtotal - discount
  const tax = Math.round((taxable * (Number(taxRate) || 0)) / 100)
  return { subtotal_cents: subtotal, discount_cents: discount, tax_cents: tax, total_cents: taxable + tax }
}

function toDateString(value) {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayString() {
  return toDateString(new Date())
}

export function displayStatus(doc, paidCents) {
  const due = toDateString(doc.due_date)
  if (doc.kind === 'invoice' && ['sent', 'partially_paid'].includes(doc.status) && due && due < todayString() && paidCents < Number(doc.total_cents)) {
    return 'overdue'
  }
  if (doc.kind === 'quote' && doc.status === 'sent' && due && due < todayString()) return 'expired'
  return doc.status
}

export function serializeDocument(doc, items = [], payments = [], { includeInternal = false } = {}) {
  const paid = payments.reduce((sum, p) => sum + Number(p.amount_cents), 0)
  const total = Number(doc.total_cents)
  const status = displayStatus(doc, paid)
  const result = {
    id: doc.id,
    kind: doc.kind,
    number: doc.number,
    status: doc.status,
    display_status: status,
    status_label: BILLING_STATUS_LABELS[status],
    title: doc.title,
    reference: doc.reference ?? undefined,
    client: {
      name: doc.client_name,
      email: doc.client_email,
      phone: doc.client_phone,
      company: doc.client_company,
      address: doc.client_address,
    },
    currency: doc.currency,
    issue_date: toDateString(doc.issue_date),
    due_date: toDateString(doc.due_date),
    items: items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unit_price_cents: Number(item.unit_price_cents),
      amount_cents: Number(item.amount_cents),
    })),
    subtotal_cents: Number(doc.subtotal_cents),
    discount_cents: Number(doc.discount_cents),
    tax_label: doc.tax_label,
    tax_rate: Number(doc.tax_rate),
    tax_cents: Number(doc.tax_cents),
    total_cents: total,
    paid_cents: paid,
    balance_cents: Math.max(0, total - paid),
    notes: doc.notes,
    terms: doc.terms,
    client_response_note: doc.client_response_note,
    sent_at: doc.sent_at,
    responded_at: doc.responded_at,
    source_quote_id: doc.source_quote_id,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
  if (includeInternal) {
    result.inquiry_id = doc.inquiry_id
    result.payments = payments.map((p) => ({
      id: p.id,
      amount_cents: Number(p.amount_cents),
      method: p.method,
      reference: p.reference,
      paid_on: toDateString(p.paid_on),
      note: p.note,
    }))
  } else {
    result.payments = payments.map((p) => ({ amount_cents: Number(p.amount_cents), method: p.method, paid_on: toDateString(p.paid_on) }))
  }
  return result
}

export async function loadDocument(id, options) {
  const doc = await one(
    `select d.*, i.reference from billing_documents d join inquiries i on i.id = d.inquiry_id where d.id = $1`,
    [id],
  )
  if (!doc) return null
  const [items, payments] = await Promise.all([
    many('select * from billing_items where document_id = $1 order by position, id', [id]),
    many('select * from billing_payments where document_id = $1 order by paid_on, created_at', [id]),
  ])
  return serializeDocument(doc, items, payments, options)
}

export async function documentsForInquiry(inquiryId, { includeDrafts = false } = {}) {
  const docs = await many(
    `select d.*, coalesce((select sum(amount_cents) from billing_payments p where p.document_id = d.id), 0) as paid_sum
     from billing_documents d where d.inquiry_id = $1 ${includeDrafts ? '' : "and d.status <> 'draft'"}
     order by d.created_at`,
    [inquiryId],
  )
  return docs.map((doc) => summarize(doc))
}

export function summarize(doc) {
  const paid = Number(doc.paid_sum || 0)
  const status = displayStatus(doc, paid)
  return {
    id: doc.id,
    kind: doc.kind,
    number: doc.number,
    title: doc.title,
    status: doc.status,
    display_status: status,
    status_label: BILLING_STATUS_LABELS[status],
    currency: doc.currency,
    total_cents: Number(doc.total_cents),
    paid_cents: paid,
    balance_cents: Math.max(0, Number(doc.total_cents) - paid),
    issue_date: toDateString(doc.issue_date),
    due_date: toDateString(doc.due_date),
    client_name: doc.client_name,
    reference: doc.reference,
    inquiry_id: doc.inquiry_id,
  }
}

export function formatMoney(cents, currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100)
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`
  }
}
