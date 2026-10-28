import { many, one, query, transaction } from '../db.js'
import { badRequest, clientIp, forbidden, notFound, readJsonBody, reply, siteUrl } from '../http.js'
import { decryptSecret, requireUser, sha256 } from '../auth.js'
import { rateLimit } from '../rateLimit.js'
import { Validator, isUuid } from '../validate.js'
import { emailLayout, sendEmail } from '../email.js'
import { getSettings } from '../content.js'
import {
  BILLING_STATUS_LABELS,
  PAYMENT_METHODS,
  computeTotals,
  formatMoney,
  lineAmount,
  loadDocument,
  summarize,
} from '../billing.js'
import { loadForClient } from './inquiries.js'

const EVERYONE = ['cto', 'admin', 'staff']
const MANAGERS = ['cto', 'admin']
const MAX_CENTS = 100000000000

function parseCents(raw, field, label, errors) {
  if (raw === undefined || raw === null || raw === '') return 0
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, ''))
  if (!Number.isFinite(value) || value < 0) {
    errors[field] = `${label} must be a positive amount.`
    return 0
  }
  const cents = Math.round(value * 100)
  if (cents > MAX_CENTS) {
    errors[field] = `${label} is too large.`
    return 0
  }
  return cents
}

function documentValues(body) {
  const v = new Validator(body)
    .text('title', { required: true, max: 160, label: 'Title' })
    .text('client_name', { required: true, max: 160, label: 'Client name' })
    .email('client_email', { label: 'Client email' })
    .phone('client_phone', { label: 'Client phone' })
    .text('client_company', { max: 160, label: 'Company' })
    .text('client_address', { max: 400, label: 'Address', multiline: true })
    .text('currency', { required: true, max: 3, label: 'Currency' })
    .date('issue_date', { label: 'Issue date' })
    .date('due_date', { label: 'Due date' })
    .text('tax_label', { max: 30, label: 'Tax name' })
    .text('notes', { max: 4000, label: 'Notes', multiline: true })
    .text('terms', { max: 4000, label: 'Terms', multiline: true })
  const errors = v.errors
  const currency = (v.values.currency || '').toUpperCase()
  if (currency && !/^[A-Z]{3}$/.test(currency)) v.fail('currency', 'Use a 3-letter currency code.')
  v.values.currency = currency

  const taxRate = body.tax_rate === undefined || body.tax_rate === null || body.tax_rate === '' ? 0 : Number(body.tax_rate)
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) v.fail('tax_rate', 'Tax rate must be between 0 and 100.')
  v.values.tax_rate = Math.round(taxRate * 100) / 100
  v.values.discount_cents = parseCents(body.discount, 'discount', 'Discount', errors)

  if (!Array.isArray(body.items) || body.items.length === 0) {
    v.fail('items', 'Add at least one line item.')
  } else if (body.items.length > 50) {
    v.fail('items', 'A document can have at most 50 line items.')
  }
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 50).map((item, index) => {
    const row = item && typeof item === 'object' ? item : {}
    const description = typeof row.description === 'string' ? row.description.trim() : ''
    if (!description) v.fail(`items.${index}.description`, 'Describe this item.')
    else if (description.length > 500) v.fail(`items.${index}.description`, 'Keep the description under 500 characters.')
    const quantity = Number(row.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) v.fail(`items.${index}.quantity`, 'Quantity must be more than 0.')
    const unit = typeof row.unit === 'string' ? row.unit.trim().slice(0, 30) : ''
    const unitPriceCents = parseCents(row.unit_price, `items.${index}.unit_price`, 'Price', errors)
    const qty = Math.round((Number.isFinite(quantity) ? quantity : 0) * 100) / 100
    return { description, quantity: qty, unit, unit_price_cents: unitPriceCents, amount_cents: lineAmount(qty, unitPriceCents) }
  })
  const values = v.done()
  if (values.issue_date && values.due_date && values.due_date < values.issue_date) {
    throw badRequest('Please fix the highlighted fields.', { due_date: 'The due date cannot be before the issue date.' })
  }
  const totals = computeTotals(items, values.discount_cents, values.tax_rate)
  return { ...values, items, ...totals, tax_label: values.tax_label || 'VAT' }
}

async function saveItems(tx, documentId, items) {
  await tx.query('delete from billing_items where document_id = $1', [documentId])
  for (const [index, item] of items.entries()) {
    await tx.query(
      `insert into billing_items (document_id, position, description, quantity, unit, unit_price_cents, amount_cents)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [documentId, index, item.description, item.quantity, item.unit, item.unit_price_cents, item.amount_cents],
    )
  }
}

async function requireDocument(id) {
  if (!isUuid(id)) throw notFound('Document not found.')
  const doc = await one('select * from billing_documents where id = $1', [id])
  if (!doc) throw notFound('Document not found.')
  return doc
}

async function listDocuments({ req, query: q }) {
  await requireUser(req, EVERYONE)
  const conditions = []
  const params = []
  const kind = q.get('kind')
  if (kind === 'quote' || kind === 'invoice') {
    params.push(kind)
    conditions.push(`d.kind = $${params.length}`)
  }
  const status = q.get('status')
  if (status && Object.keys(BILLING_STATUS_LABELS).includes(status) && status !== 'overdue' && status !== 'expired') {
    params.push(status)
    conditions.push(`d.status = $${params.length}`)
  }
  const search = q.get('q')
  if (search) {
    params.push(`%${search.toLowerCase().slice(0, 80)}%`)
    const n = params.length
    conditions.push(`(lower(coalesce(d.number, '')) like $${n} or lower(d.client_name) like $${n} or lower(d.title) like $${n} or lower(i.reference) like $${n})`)
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  const rows = await many(
    `select d.*, i.reference,
       coalesce((select sum(amount_cents) from billing_payments p where p.document_id = d.id), 0) as paid_sum
     from billing_documents d join inquiries i on i.id = d.inquiry_id ${where}
     order by d.created_at desc limit 300`,
    params,
  )
  const documents = rows.map(summarize)
  const outstanding = {}
  for (const doc of documents) {
    if (doc.kind === 'invoice' && ['sent', 'partially_paid', 'overdue'].includes(doc.display_status)) {
      outstanding[doc.currency] = (outstanding[doc.currency] || 0) + doc.balance_cents
    }
  }
  return { documents, outstanding, labels: BILLING_STATUS_LABELS }
}

async function getDocument({ req, params }) {
  await requireUser(req, EVERYONE)
  const doc = await loadDocument((await requireDocument(params.id)).id, { includeInternal: true })
  return { document: doc, settings: await getSettings() }
}

async function createDocument({ req }) {
  const user = await requireUser(req, MANAGERS)
  const body = await readJsonBody(req)
  if (body.kind !== 'quote' && body.kind !== 'invoice') throw badRequest('Choose quote or invoice.')
  if (!isUuid(body.inquiry_id)) throw badRequest('Choose the client request this document belongs to.')
  const inquiry = await one('select id from inquiries where id = $1', [body.inquiry_id])
  if (!inquiry) throw notFound('Client request not found.')
  const d = documentValues(body)
  const id = await transaction(async (tx) => {
    const row = await tx.one(
      `insert into billing_documents (kind, inquiry_id, title, client_name, client_email, client_phone, client_company, client_address,
         currency, issue_date, due_date, discount_cents, tax_label, tax_rate, subtotal_cents, tax_cents, total_cents, notes, terms, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,coalesce($10::date, current_date),$11,$12,$13,$14,$15,$16,$17,coalesce($18,''),coalesce($19,''),$20)
       returning id`,
      [
        body.kind, inquiry.id, d.title, d.client_name, d.client_email, d.client_phone, d.client_company, d.client_address,
        d.currency, d.issue_date, d.due_date, d.discount_cents, d.tax_label, d.tax_rate, d.subtotal_cents, d.tax_cents,
        d.total_cents, d.notes, d.terms, user.id,
      ],
    )
    await saveItems(tx, row.id, d.items)
    return row.id
  })
  return reply(201, { document: await loadDocument(id, { includeInternal: true }) })
}

async function updateDocument({ req, params }) {
  await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  if (existing.status !== 'draft') throw forbidden('Only drafts can be edited. Duplicate it to make changes.')
  const d = documentValues(await readJsonBody(req))
  await transaction(async (tx) => {
    await tx.query(
      `update billing_documents set title=$2, client_name=$3, client_email=$4, client_phone=$5, client_company=$6, client_address=$7,
         currency=$8, issue_date=coalesce($9::date, issue_date), due_date=$10, discount_cents=$11, tax_label=$12, tax_rate=$13,
         subtotal_cents=$14, tax_cents=$15, total_cents=$16, notes=coalesce($17,''), terms=coalesce($18,''), updated_at=now()
       where id=$1`,
      [
        existing.id, d.title, d.client_name, d.client_email, d.client_phone, d.client_company, d.client_address, d.currency,
        d.issue_date, d.due_date, d.discount_cents, d.tax_label, d.tax_rate, d.subtotal_cents, d.tax_cents, d.total_cents,
        d.notes, d.terms,
      ],
    )
    await saveItems(tx, existing.id, d.items)
  })
  return { document: await loadDocument(existing.id, { includeInternal: true }) }
}

async function deleteDocument({ req, params }) {
  await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  if (existing.status !== 'draft') throw forbidden('Sent documents cannot be deleted. Void an invoice instead.')
  await query('delete from billing_documents where id = $1', [existing.id])
  return { ok: true }
}

async function duplicateDocument({ req, params, kind }) {
  const user = await requireUser(req, MANAGERS)
  const source = await requireDocument(params.id)
  const targetKind = kind || source.kind
  if (kind === 'invoice' && source.kind !== 'quote') throw badRequest('Only a quote can be turned into an invoice.')
  const settings = await getSettings()
  const dueDays = Number(settings.invoice_due_days) || 14
  const id = await transaction(async (tx) => {
    const row = await tx.one(
      `insert into billing_documents (kind, inquiry_id, source_quote_id, title, client_name, client_email, client_phone, client_company,
         client_address, currency, issue_date, due_date, discount_cents, tax_label, tax_rate, subtotal_cents, tax_cents, total_cents,
         notes, terms, created_by)
       select $2, inquiry_id, $3, title, client_name, client_email, client_phone, client_company, client_address, currency,
         current_date, current_date + $4::int, discount_cents, tax_label, tax_rate, subtotal_cents, tax_cents, total_cents,
         notes, $5, $6
       from billing_documents where id = $1 returning id`,
      [
        source.id,
        targetKind,
        kind === 'invoice' ? source.id : null,
        targetKind === 'invoice' ? dueDays : 30,
        targetKind === source.kind ? source.terms : targetKind === 'invoice' ? settings.invoice_terms || '' : settings.quote_terms || '',
        user.id,
      ],
    )
    await tx.query(
      `insert into billing_items (document_id, position, description, quantity, unit, unit_price_cents, amount_cents)
       select $2, position, description, quantity, unit, unit_price_cents, amount_cents from billing_items where document_id = $1`,
      [source.id, row.id],
    )
    return row.id
  })
  return reply(201, { document: await loadDocument(id, { includeInternal: true }) })
}

async function sendDocument({ req, params }) {
  const user = await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  if (!['draft', 'sent'].includes(existing.status)) throw badRequest('This document can no longer be sent.')
  const inquiry = await one('select * from inquiries where id = $1', [existing.inquiry_id])
  const label = existing.kind === 'quote' ? 'Quotation' : 'Invoice'
  await transaction(async (tx) => {
    if (!existing.number) {
      const seq = await tx.one(`select nextval('${existing.kind === 'quote' ? 'quote_number_seq' : 'invoice_number_seq'}') as n`)
      const prefix = existing.kind === 'quote' ? 'QT' : 'INV'
      await tx.query('update billing_documents set number = $2 where id = $1', [
        existing.id,
        `${prefix}-${new Date().getFullYear()}-${String(seq.n).padStart(4, '0')}`,
      ])
    }
    await tx.query(`update billing_documents set status = 'sent', sent_at = now(), updated_at = now() where id = $1`, [existing.id])
    const numbered = await tx.one('select number, total_cents, currency from billing_documents where id = $1', [existing.id])
    await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'system', $2, $3)`, [
      inquiry.id,
      user.id,
      `${label} ${numbered.number} for ${formatMoney(Number(numbered.total_cents), numbered.currency)} ${existing.status === 'sent' ? 're-sent' : 'sent'}.`,
    ])
    if (existing.kind === 'quote' && ['new', 'in_review', 'awaiting_client'].includes(inquiry.status)) {
      await tx.query(`update inquiries set status = 'proposal_sent', updated_at = now() where id = $1`, [inquiry.id])
    }
  })

  const doc = await loadDocument(existing.id, { includeInternal: true })
  const token = decryptSecret(inquiry.access_token_enc)
  const link = token ? `${siteUrl(req)}/requests/${encodeURIComponent(inquiry.reference)}/documents/${doc.id}?token=${encodeURIComponent(token)}` : null
  let delivery = { sent: false }
  if (link) {
    const amount = formatMoney(doc.total_cents, doc.currency)
    delivery = await sendEmail({
      to: doc.client.email,
      replyTo: process.env.TEAM_NOTIFICATION_EMAIL || undefined,
      subject: `${label} ${doc.number} from Lephas Company Ltd`,
      html: emailLayout(
        `${label} ${doc.number}`,
        [
          `Hello ${doc.client.name.split(' ')[0]},`,
          doc.kind === 'quote'
            ? `Here is our quotation for "${doc.title}". Total: ${amount}${doc.due_date ? `, valid until ${doc.due_date}` : ''}. You can accept or decline it online.`
            : `Here is your invoice for "${doc.title}". Amount due: ${amount}${doc.due_date ? `, due by ${doc.due_date}` : ''}. Payment details are on the invoice.`,
        ],
        { label: doc.kind === 'quote' ? 'View quotation' : 'View invoice', url: link },
      ),
      text: `${label} ${doc.number}: ${amount}. View it here: ${link}`,
    })
  }
  return { document: doc, email_sent: delivery.sent, client_link: link }
}

async function setQuoteDecision({ req, params }) {
  const user = await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  const body = await readJsonBody(req)
  if (existing.kind !== 'quote') throw badRequest('Only quotes can be accepted or declined.')
  if (!['sent', 'accepted', 'declined'].includes(existing.status)) throw badRequest('Send the quote before recording a decision.')
  if (body.decision !== 'accepted' && body.decision !== 'declined') throw badRequest('Choose accepted or declined.')
  await transaction(async (tx) => {
    await tx.query('update billing_documents set status = $2, responded_at = now(), updated_at = now() where id = $1', [existing.id, body.decision])
    await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'system', $2, $3)`, [
      existing.inquiry_id,
      user.id,
      `Quotation ${existing.number} marked as ${body.decision} by the Lephas team.`,
    ])
    if (body.decision === 'accepted') {
      await tx.query(`update inquiries set status = 'won', updated_at = now() where id = $1`, [existing.inquiry_id])
    }
  })
  return { document: await loadDocument(existing.id, { includeInternal: true }) }
}

async function voidInvoice({ req, params }) {
  const user = await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  if (existing.kind !== 'invoice' || existing.status === 'draft') throw badRequest('Only sent invoices can be voided.')
  if (existing.status === 'void') return { document: await loadDocument(existing.id, { includeInternal: true }) }
  await transaction(async (tx) => {
    await tx.query(`update billing_documents set status = 'void', updated_at = now() where id = $1`, [existing.id])
    await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'system', $2, $3)`, [
      existing.inquiry_id,
      user.id,
      `Invoice ${existing.number} was cancelled.`,
    ])
  })
  return { document: await loadDocument(existing.id, { includeInternal: true }) }
}

async function refreshInvoiceStatus(tx, documentId) {
  const row = await tx.one(
    `select d.status, d.total_cents, coalesce((select sum(amount_cents) from billing_payments where document_id = d.id), 0) as paid
     from billing_documents d where d.id = $1`,
    [documentId],
  )
  const paid = Number(row.paid)
  const next = paid <= 0 ? 'sent' : paid >= Number(row.total_cents) ? 'paid' : 'partially_paid'
  if (row.status !== 'void' && row.status !== next) {
    await tx.query('update billing_documents set status = $2, updated_at = now() where id = $1', [documentId, next])
  }
  return next
}

async function addPayment({ req, params }) {
  const user = await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  if (existing.kind !== 'invoice') throw badRequest('Payments can only be recorded on invoices.')
  if (!['sent', 'partially_paid', 'paid'].includes(existing.status)) throw badRequest('Send the invoice before recording payments.')
  const body = await readJsonBody(req)
  const errors = {}
  const amount = parseCents(body.amount, 'amount', 'Amount', errors)
  const v = new Validator(body)
    .oneOf('method', PAYMENT_METHODS, { required: true, label: 'Payment method' })
    .text('reference', { max: 120, label: 'Reference' })
    .date('paid_on', { label: 'Payment date' })
    .text('note', { max: 500, label: 'Note' })
  Object.assign(v.errors, errors)
  if (!errors.amount && amount <= 0) v.fail('amount', 'Enter the amount received.')
  const values = v.done()
  const status = await transaction(async (tx) => {
    await tx.query(
      `insert into billing_payments (document_id, amount_cents, method, reference, paid_on, note, recorded_by)
       values ($1, $2, $3, $4, coalesce($5::date, current_date), $6, $7)`,
      [existing.id, amount, values.method, values.reference, values.paid_on, values.note, user.id],
    )
    const next = await refreshInvoiceStatus(tx, existing.id)
    await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'system', $2, $3)`, [
      existing.inquiry_id,
      user.id,
      `Payment of ${formatMoney(amount, existing.currency)} received for invoice ${existing.number}. Thank you!`,
    ])
    return next
  })
  const doc = await loadDocument(existing.id, { includeInternal: true })
  if (status === 'paid') {
    const inquiry = await one('select reference, access_token_enc from inquiries where id = $1', [existing.inquiry_id])
    const token = decryptSecret(inquiry.access_token_enc)
    const link = token ? `${siteUrl(req)}/requests/${encodeURIComponent(inquiry.reference)}/documents/${doc.id}?token=${encodeURIComponent(token)}` : null
    await sendEmail({
      to: doc.client.email,
      subject: `Payment received for invoice ${doc.number}`,
      html: emailLayout(`Thank you for your payment`, [`Invoice ${doc.number} is now fully paid.`], link ? { label: 'View receipt', url: link } : undefined),
      text: `Invoice ${doc.number} is now fully paid. ${link ?? ''}`,
    })
  }
  return reply(201, { document: doc })
}

async function deletePayment({ req, params }) {
  await requireUser(req, MANAGERS)
  const existing = await requireDocument(params.id)
  if (!isUuid(params.paymentId)) throw notFound('Payment not found.')
  await transaction(async (tx) => {
    const result = await tx.query('delete from billing_payments where id = $1 and document_id = $2', [params.paymentId, existing.id])
    if (result.rowCount === 0) throw notFound('Payment not found.')
    await refreshInvoiceStatus(tx, existing.id)
  })
  return { document: await loadDocument(existing.id, { includeInternal: true }) }
}

async function clientDocument({ req, params, query: q }) {
  const token = q.get('token') || req.headers['x-access-token']
  const inquiry = await loadForClient(params.reference, token)
  if (!isUuid(params.id)) throw notFound('Document not found.')
  const row = await one(`select id from billing_documents where id = $1 and inquiry_id = $2 and status <> 'draft'`, [params.id, inquiry.id])
  if (!row) throw notFound('Document not found.')
  return { document: await loadDocument(row.id), settings: await getSettings(), request: { reference: inquiry.reference } }
}

async function clientDecision({ req, params }) {
  const body = await readJsonBody(req)
  await rateLimit(`decision:${sha256(clientIp(req)).slice(0, 24)}`, 20, 3600)
  const inquiry = await loadForClient(params.reference, body.token)
  if (!isUuid(params.id)) throw notFound('Document not found.')
  const doc = await one(`select * from billing_documents where id = $1 and inquiry_id = $2`, [params.id, inquiry.id])
  if (!doc || doc.status === 'draft') throw notFound('Document not found.')
  if (doc.kind !== 'quote') throw badRequest('Only quotations can be accepted or declined.')
  if (doc.status !== 'sent') throw badRequest('You have already responded to this quotation.')
  if (doc.due_date && String(doc.due_date).slice(0, 10) < new Date().toISOString().slice(0, 10)) {
    throw badRequest('This quotation has expired. Please message us for an updated one.')
  }
  const { decision, note } = new Validator(body)
    .oneOf('decision', ['accept', 'decline'], { required: true, label: 'Decision' })
    .text('note', { max: 1000, label: 'Note', multiline: true })
    .done()
  const status = decision === 'accept' ? 'accepted' : 'declined'
  await transaction(async (tx) => {
    await tx.query(
      `update billing_documents set status = $2, client_response_note = $3, responded_at = now(), updated_at = now() where id = $1`,
      [doc.id, status, note],
    )
    await tx.query(`insert into messages (inquiry_id, sender, body) values ($1, 'system', $2)`, [
      inquiry.id,
      `${inquiry.full_name} ${status} quotation ${doc.number}.${note ? ` Note: ${note}` : ''}`,
    ])
    if (status === 'accepted') await tx.query(`update inquiries set status = 'won', updated_at = now() where id = $1`, [inquiry.id])
    else await tx.query(`update inquiries set status = 'in_review', updated_at = now() where id = $1`, [inquiry.id])
  })
  await sendEmail({
    to: process.env.TEAM_NOTIFICATION_EMAIL,
    replyTo: inquiry.email,
    subject: `Quotation ${doc.number} ${status} by ${inquiry.full_name}`,
    html: emailLayout(`Quotation ${doc.number} was ${status}`, [
      `${inquiry.full_name} ${status} the quotation "${doc.title}" (${formatMoney(Number(doc.total_cents), doc.currency)}).`,
      note ? `Their note: ${note}` : '',
      status === 'accepted' ? 'Next step: convert it to an invoice from the admin area.' : 'Follow up to understand what would work better.',
    ].filter(Boolean), { label: 'Open in admin', url: `${siteUrl(req)}/admin/inquiries/${inquiry.id}` }),
    text: `Quotation ${doc.number} ${status} by ${inquiry.full_name}.`,
  })
  return { document: await loadDocument(doc.id) }
}

export default [
  { method: 'GET', path: '/api/admin/billing', handler: listDocuments },
  { method: 'POST', path: '/api/admin/billing', handler: createDocument },
  { method: 'GET', path: '/api/admin/billing/:id', handler: getDocument },
  { method: 'PUT', path: '/api/admin/billing/:id', handler: updateDocument },
  { method: 'DELETE', path: '/api/admin/billing/:id', handler: deleteDocument },
  { method: 'POST', path: '/api/admin/billing/:id/send', handler: sendDocument },
  { method: 'POST', path: '/api/admin/billing/:id/duplicate', handler: (ctx) => duplicateDocument(ctx) },
  { method: 'POST', path: '/api/admin/billing/:id/convert', handler: (ctx) => duplicateDocument({ ...ctx, kind: 'invoice' }) },
  { method: 'POST', path: '/api/admin/billing/:id/decision', handler: setQuoteDecision },
  { method: 'POST', path: '/api/admin/billing/:id/void', handler: voidInvoice },
  { method: 'POST', path: '/api/admin/billing/:id/payments', handler: addPayment },
  { method: 'DELETE', path: '/api/admin/billing/:id/payments/:paymentId', handler: deletePayment },
  { method: 'GET', path: '/api/inquiries/:reference/documents/:id', handler: clientDocument },
  { method: 'POST', path: '/api/inquiries/:reference/documents/:id/decision', handler: clientDecision },
]

