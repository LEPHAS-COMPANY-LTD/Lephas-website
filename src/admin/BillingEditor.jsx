import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import BillingDocument, { BillingBadge } from '../components/BillingDocument.jsx'
import { BackLink, ErrorState, Loader, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { PAYMENT_METHODS, addDays, computeTotals, formatCents, printDocument, toCents } from '../lib/billing.js'
import { AdminHeader, Modal, Toast } from './shared.jsx'
import { useAdmin } from './context.js'

const emptyItem = () => ({ description: '', quantity: 1, unit: '', unit_price: '' })
const centsToInput = (cents) => (cents === null || cents === undefined ? '' : (Number(cents) / 100).toFixed(2))

async function loadNew(inquiryId, kind, opts) {
  const [{ inquiry }, { settings }, { services }] = await Promise.all([
    api.admin.inquiry(inquiryId, opts),
    api.admin.settings(opts),
    api.admin.services(opts),
  ])
  let member = null
  if (inquiry.member?.slug) member = await api.member(inquiry.member.slug, opts).then((r) => r.member).catch(() => null)
  const service = services.find((s) => s.id === inquiry.service?.id)
  const unit = inquiry.engagement === 'monthly' ? 'month' : inquiry.engagement === 'hourly' || member ? 'hour' : service?.price_unit === 'project' || !service ? 'project' : service.price_unit
  const items = []
  if (member) {
    items.push({
      description: `${member.full_name}, ${member.title}${inquiry.service ? ` · ${inquiry.service.name}` : ''}`,
      quantity: 1,
      unit,
      unit_price: member.hourly_rate !== null && member.hourly_rate !== undefined ? String(unit === 'month' ? member.hourly_rate * 160 : member.hourly_rate) : '',
    })
  } else if (service) {
    items.push({
      description: `${service.name}${inquiry.subject ? `: ${inquiry.subject}` : ''}`,
      quantity: 1,
      unit: service.price_unit === 'project' ? 'project' : service.price_unit,
      unit_price: service.starting_price !== null && service.starting_price !== undefined ? String(service.starting_price) : '',
    })
  } else {
    items.push(emptyItem())
  }
  return {
    settings,
    inquiry,
    draft: {
      kind,
      inquiry_id: inquiry.id,
      title: inquiry.subject || (kind === 'quote' ? 'Project quotation' : 'Services'),
      client_name: inquiry.full_name,
      client_email: inquiry.email,
      client_phone: inquiry.phone || '',
      client_company: inquiry.company || '',
      client_address: inquiry.country || '',
      currency: settings.currency || 'USD',
      issue_date: addDays(0),
      due_date: addDays(kind === 'invoice' ? Number(settings.invoice_due_days) || 14 : 30),
      discount: '',
      tax_label: settings.default_tax_label || 'VAT',
      tax_rate: settings.default_tax_rate || '0',
      notes: '',
      terms: kind === 'invoice' ? settings.invoice_terms || '' : settings.quote_terms || '',
      items,
    },
  }
}

function toDraft(doc) {
  return {
    kind: doc.kind,
    inquiry_id: doc.inquiry_id,
    title: doc.title,
    client_name: doc.client.name,
    client_email: doc.client.email,
    client_phone: doc.client.phone || '',
    client_company: doc.client.company || '',
    client_address: doc.client.address || '',
    currency: doc.currency,
    issue_date: doc.issue_date,
    due_date: doc.due_date || '',
    discount: doc.discount_cents ? centsToInput(doc.discount_cents) : '',
    tax_label: doc.tax_label,
    tax_rate: String(doc.tax_rate),
    notes: doc.notes,
    terms: doc.terms,
    items: doc.items.map((item) => ({ description: item.description, quantity: item.quantity, unit: item.unit, unit_price: centsToInput(item.unit_price_cents) })),
  }
}

function previewDocument(draft, base) {
  const totals = computeTotals(draft.items, draft.discount, draft.tax_rate)
  return {
    ...(base || {}),
    kind: draft.kind,
    number: base?.number ?? null,
    display_status: 'draft',
    status: 'draft',
    title: draft.title,
    reference: base?.reference,
    client: { name: draft.client_name, email: draft.client_email, phone: draft.client_phone, company: draft.client_company, address: draft.client_address },
    currency: (draft.currency || 'USD').toUpperCase(),
    issue_date: draft.issue_date,
    due_date: draft.due_date,
    items: draft.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unit: item.unit,
      unit_price_cents: toCents(item.unit_price),
      amount_cents: Math.round((Number(item.quantity) || 0) * toCents(item.unit_price)),
    })),
    subtotal_cents: totals.subtotal,
    discount_cents: totals.discount,
    tax_label: draft.tax_label,
    tax_rate: Number(draft.tax_rate) || 0,
    tax_cents: totals.tax,
    total_cents: totals.total,
    paid_cents: 0,
    balance_cents: totals.total,
    payments: [],
    notes: draft.notes,
    terms: draft.terms,
  }
}

function Editor({ initial, base, settings, saving, errors, onSave }) {
  const [draft, setDraft] = useState(initial)
  const [preview, setPreview] = useState(false)
  const totals = useMemo(() => computeTotals(draft.items, draft.discount, draft.tax_rate), [draft])
  const currency = (draft.currency || 'USD').toUpperCase()
  const set = (key) => (event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))
  const setItem = (index, key) => (event) =>
    setDraft((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, [key]: event.target.value } : item)) }))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave(draft, false)
      }}
      className="space-y-8"
      noValidate
    >
      <div className="flex flex-wrap gap-3">
        <button type="button" className={`btn btn-sm ${!preview ? 'chip-active' : ''}`} onClick={() => setPreview(false)}>
          <Icon name="edit" size={16} /> Edit
        </button>
        <button type="button" className={`btn btn-sm ${preview ? 'chip-active' : ''}`} onClick={() => setPreview(true)}>
          <Icon name="receipt" size={16} /> Preview
        </button>
      </div>

      {preview ? (
        <BillingDocument document={previewDocument(draft, base)} settings={settings} />
      ) : (
        <>
          <section className="neu space-y-5 p-6 sm:p-8">
            <p className="font-bold text-slate">Client</p>
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput label="Client name" required value={draft.client_name} onChange={set('client_name')} error={errors.client_name} />
              <TextInput label="Client email" type="email" required value={draft.client_email} onChange={set('client_email')} error={errors.client_email} />
              <TextInput label="Company" value={draft.client_company} onChange={set('client_company')} error={errors.client_company} />
              <TextInput label="Phone" value={draft.client_phone} onChange={set('client_phone')} error={errors.client_phone} />
            </div>
            <TextArea label="Address" rows={2} value={draft.client_address} onChange={set('client_address')} error={errors.client_address} />
          </section>

          <section className="neu space-y-5 p-6 sm:p-8">
            <p className="font-bold text-slate">Details</p>
            <TextInput label="Title" required placeholder="e.g. Company website, phase 1" value={draft.title} onChange={set('title')} error={errors.title} />
            <div className="grid gap-5 sm:grid-cols-3">
              <TextInput label="Issue date" type="date" value={draft.issue_date} onChange={set('issue_date')} error={errors.issue_date} />
              <TextInput
                label={draft.kind === 'quote' ? 'Valid until' : 'Due date'}
                type="date"
                value={draft.due_date}
                onChange={set('due_date')}
                error={errors.due_date}
              />
              <TextInput label="Currency" maxLength={3} value={draft.currency} onChange={set('currency')} error={errors.currency} />
            </div>
          </section>

          <section className="neu p-6 sm:p-8">
            <p className="mb-5 font-bold text-slate">Line items</p>
            {errors.items && <p className="field-error mb-4">{errors.items}</p>}
            <ol className="space-y-4">
              {draft.items.map((item, index) => (
                <li key={index} className="neu-inset-sm grid gap-3 p-4 md:grid-cols-[1fr_6rem_6rem_9rem_8rem_auto] md:items-start">
                  <TextArea
                    label={index === 0 ? 'Description' : undefined}
                    aria-label="Description"
                    rows={2}
                    value={item.description}
                    onChange={setItem(index, 'description')}
                    error={errors[`items.${index}.description`]}
                  />
                  <TextInput
                    label={index === 0 ? 'Qty' : undefined}
                    aria-label="Quantity"
                    type="number"
                    min={0}
                    step="0.25"
                    value={item.quantity}
                    onChange={setItem(index, 'quantity')}
                    error={errors[`items.${index}.quantity`]}
                  />
                  <TextInput label={index === 0 ? 'Unit' : undefined} aria-label="Unit" placeholder="hour" value={item.unit} onChange={setItem(index, 'unit')} />
                  <TextInput
                    label={index === 0 ? `Price (${currency})` : undefined}
                    aria-label="Unit price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={setItem(index, 'unit_price')}
                    error={errors[`items.${index}.unit_price`]}
                  />
                  <div className={index === 0 ? 'md:pt-7' : ''}>
                    <p className="py-3 text-right text-sm font-semibold text-slate">
                      {formatCents(Math.round((Number(item.quantity) || 0) * toCents(item.unit_price)), currency)}
                    </p>
                  </div>
                  <div className={index === 0 ? 'md:pt-7' : ''}>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger h-10 w-10 p-0"
                      aria-label={`Remove item ${index + 1}`}
                      disabled={draft.items.length === 1}
                      onClick={() => setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-sm mt-5"
              disabled={draft.items.length >= 50}
              onClick={() => setDraft((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
            >
              <Icon name="plus" size={16} /> Add line
            </button>

            <div className="mt-8 grid gap-6 md:grid-cols-[1fr_20rem]">
              <div className="grid gap-5 sm:grid-cols-3">
                <TextInput label={`Discount (${currency})`} type="number" min={0} step="0.01" value={draft.discount} onChange={set('discount')} error={errors.discount} />
                <TextInput label="Tax name" value={draft.tax_label} onChange={set('tax_label')} error={errors.tax_label} />
                <TextInput label="Tax rate (%)" type="number" min={0} max={100} step="0.01" value={draft.tax_rate} onChange={set('tax_rate')} error={errors.tax_rate} />
              </div>
              <dl className="neu-inset space-y-2 p-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd>{formatCents(totals.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd>-{formatCents(totals.discount, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{draft.tax_label || 'Tax'}</dt>
                  <dd>{formatCents(totals.tax, currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-silver pt-2 text-[1rem] font-bold text-slate">
                  <dt>Total</dt>
                  <dd>{formatCents(totals.total, currency)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="neu grid gap-5 p-6 sm:p-8 md:grid-cols-2">
            <TextArea label="Notes for the client" rows={4} value={draft.notes} onChange={set('notes')} error={errors.notes} />
            <TextArea label="Terms" rows={4} value={draft.terms} onChange={set('terms')} error={errors.terms} />
          </section>
        </>
      )}

      {Object.keys(errors).length > 0 && <p className="field-error">Please fix the highlighted fields.</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onSave(draft, true)}>
          <Icon name="send" size={16} />
          Save and send to client
        </button>
      </div>
    </form>
  )
}

function PaymentForm({ document: doc, onDone, onCancel }) {
  const [form, setForm] = useState({ amount: centsToInput(doc.balance_cents), method: 'bank_transfer', reference: '', paid_on: addDays(0), note: '' })
  const [state, setState] = useState({ saving: false, error: null })
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    setState({ saving: true, error: null })
    try {
      const result = await api.admin.addPayment(doc.id, form)
      onDone(result.document)
    } catch (error) {
      setState({ saving: false, error })
    }
  }
  const errors = state.error?.fields || {}
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label={`Amount (${doc.currency})`} type="number" min={0} step="0.01" required value={form.amount} onChange={set('amount')} error={errors.amount} />
        <div>
          <label htmlFor="pay-method" className="field-label">
            Method
          </label>
          <select id="pay-method" className="field" value={form.method} onChange={set('method')}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <TextInput label="Reference (e.g. M-Pesa code)" value={form.reference} onChange={set('reference')} error={errors.reference} />
        <TextInput label="Date received" type="date" value={form.paid_on} onChange={set('paid_on')} error={errors.paid_on} />
      </div>
      <TextInput label="Internal note" value={form.note} onChange={set('note')} error={errors.note} />
      {state.error && !Object.keys(errors).length && <p className="field-error">{state.error.message}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Record payment'}
        </button>
      </div>
    </form>
  )
}

export default function BillingEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { canManage } = useAdmin()
  const isNew = id === 'new'
  const inquiryId = params.get('inquiry')
  const kind = params.get('kind') === 'invoice' ? 'invoice' : 'quote'
  const { data, error, loading, reload, setData } = useAsync(
    (opts) => (isNew ? loadNew(inquiryId, kind, opts) : api.admin.document(id, opts)),
    [id, inquiryId, kind],
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [actionError, setActionError] = useState(null)
  const [toast, setToast] = useState(null)
  const [paying, setPaying] = useState(false)
  const [clientLink, setClientLink] = useState(null)

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data || (isNew ? !data.draft : !data.document)) return <Loader />

  const doc = isNew ? null : data.document
  const settings = data.settings
  const label = (doc?.kind ?? kind) === 'quote' ? 'Quotation' : 'Invoice'
  const backTo = `/admin/inquiries/${doc?.inquiry_id ?? inquiryId}`

  function flash(message) {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }

  async function save(draft, send) {
    setSaving(true)
    setErrors({})
    setActionError(null)
    try {
      const payload = { ...draft, currency: (draft.currency || '').toUpperCase() }
      let result = isNew ? await api.admin.createDocument(payload) : await api.admin.updateDocument(doc.id, payload)
      if (send) {
        const sent = await api.admin.sendDocument(result.document.id)
        result = sent
        setClientLink(sent.client_link)
        flash(sent.email_sent ? `${label} sent to ${sent.document.client.email}.` : `${label} ${sent.document.number} is ready. Email is not set up, so copy the link below and send it to the client.`)
      } else {
        flash('Draft saved.')
      }
      if (isNew) navigate(`/admin/billing/${result.document.id}`, { replace: true })
      else setData((prev) => ({ ...prev, document: result.document }))
    } catch (err) {
      setErrors(err.fields || {})
      setActionError(Object.keys(err.fields || {}).length ? null : err)
    } finally {
      setSaving(false)
    }
  }

  async function act(action, message, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return
    setActionError(null)
    try {
      const result = await action()
      if (result?.document && result.document.id !== doc.id) {
        navigate(`/admin/billing/${result.document.id}`)
        flash(message)
        return
      }
      if (result?.client_link) setClientLink(result.client_link)
      if (result?.document) setData((prev) => ({ ...prev, document: result.document }))
      flash(message)
    } catch (err) {
      setActionError(err)
    }
  }

  async function copy(link) {
    try {
      await navigator.clipboard.writeText(link)
      flash('Link copied.')
    } catch {
      flash('Select the link and copy it manually.')
    }
  }

  if (isNew || doc.status === 'draft') {
    if (!canManage) {
      return (
        <div>
          <BackLink to={backTo}>Back to the request</BackLink>
          <p className="neu p-6 text-sm text-muted">Only the CTO and admins can create quotes and invoices.</p>
        </div>
      )
    }
    return (
      <div>
        <BackLink to={backTo}>Back to the request</BackLink>
        <AdminHeader
          title={isNew ? `New ${label.toLowerCase()}` : `${label} draft`}
          actions={
            !isNew && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => act(() => api.admin.deleteDocument(doc.id).then(() => navigate(backTo)), 'Draft deleted.', 'Delete this draft?')}
              >
                <Icon name="trash" size={16} /> Delete draft
              </button>
            )
          }
        >
          {isNew ? `For ${data.inquiry.full_name} · ${data.inquiry.reference}` : `For ${doc.client.name} · ${doc.reference}`}
        </AdminHeader>
        {actionError && <p className="field-error mb-4">{actionError.message}</p>}
        <Editor initial={isNew ? data.draft : toDraft(doc)} base={doc} settings={settings} saving={saving} errors={errors} onSave={save} />
        <Toast message={toast} onClose={() => setToast(null)} />
      </div>
    )
  }

  const status = doc.display_status
  return (
    <div>
      <div className="no-print">
        <BackLink to={backTo}>Back to the request</BackLink>
        <AdminHeader title={`${label} ${doc.number}`} actions={<BillingBadge status={status} label={doc.status_label} />}>
          {doc.client.name} · {doc.reference} · {formatCents(doc.total_cents, doc.currency)}
          {doc.kind === 'invoice' && doc.paid_cents > 0 && ` · ${formatCents(doc.balance_cents, doc.currency)} still due`}
        </AdminHeader>

        <div className="neu mb-8 flex flex-wrap gap-3 p-4">
          <a className="btn btn-sm" href={`/api/admin/billing/${doc.id}/pdf`} download>
            <Icon name="download" size={16} /> Download PDF
          </a>
          <button type="button" className="btn btn-sm" onClick={printDocument}>
            <Icon name="receipt" size={16} /> Print
          </button>
          {canManage && (
            <>
              {['sent', 'partially_paid'].includes(doc.status) && (
                <button type="button" className="btn btn-sm" onClick={() => act(() => api.admin.sendDocument(doc.id), `${label} re-sent.`)}>
                  <Icon name="send" size={16} /> Send again
                </button>
              )}
              {doc.kind === 'invoice' && ['sent', 'partially_paid'].includes(doc.status) && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setPaying(true)}>
                  <Icon name="check" size={16} /> Record payment
                </button>
              )}
              {doc.kind === 'quote' && doc.status === 'sent' && (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => act(() => api.admin.quoteDecision(doc.id, 'accepted'), 'Marked as accepted.')}>
                    Mark accepted
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => act(() => api.admin.quoteDecision(doc.id, 'declined'), 'Marked as declined.')}>
                    Mark declined
                  </button>
                </>
              )}
              {doc.kind === 'quote' && doc.status === 'accepted' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.admin.convertToInvoice(doc.id), 'Invoice draft created from the quotation.')}>
                  <Icon name="arrow" size={16} /> Convert to invoice
                </button>
              )}
              <button type="button" className="btn btn-sm" onClick={() => act(() => api.admin.duplicateDocument(doc.id), 'Copy created as a new draft.')}>
                <Icon name="copy" size={16} /> Duplicate
              </button>
              {doc.kind === 'invoice' && doc.status !== 'void' && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => act(() => api.admin.voidInvoice(doc.id), 'Invoice voided.', 'Void this invoice? It stays on record but no longer needs to be paid.')}
                >
                  Void
                </button>
              )}
            </>
          )}
        </div>

        {clientLink && (
          <div className="neu-inset mb-8 flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted">{clientLink}</span>
            <button type="button" className="btn btn-sm" onClick={() => copy(clientLink)}>
              <Icon name="copy" size={16} /> Copy client link
            </button>
          </div>
        )}
        {doc.client_response_note && (
          <p className="neu-inset mb-8 p-4 text-sm text-slate">
            <strong>Client note:</strong> {doc.client_response_note}
          </p>
        )}
        {actionError && <p className="field-error mb-4">{actionError.message}</p>}

        {doc.kind === 'invoice' && doc.payments.length > 0 && canManage && (
          <section className="neu mb-8 p-5">
            <p className="mb-3 font-bold text-slate">Payments</p>
            <ul className="space-y-2 text-sm">
              {doc.payments.map((p) => (
                <li key={p.id} className="neu-inset-sm flex flex-wrap items-center gap-3 p-3">
                  <span className="flex-1">
                    {p.paid_on} · {PAYMENT_METHODS.find((m) => m.value === p.method)?.label}
                    {p.reference ? ` · ${p.reference}` : ''}
                    {p.note ? ` · ${p.note}` : ''}
                  </span>
                  <span className="font-semibold">{formatCents(p.amount_cents, doc.currency)}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger h-8 w-8 p-0"
                    aria-label="Remove payment"
                    onClick={() => act(() => api.admin.deletePayment(doc.id, p.id), 'Payment removed.', 'Remove this payment record?')}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <BillingDocument document={doc} settings={settings} />

      {paying && (
        <Modal title={`Record a payment for ${doc.number}`} onClose={() => setPaying(false)}>
          <PaymentForm
            document={doc}
            onCancel={() => setPaying(false)}
            onDone={(updated) => {
              setPaying(false)
              setData((prev) => ({ ...prev, document: updated }))
              flash(updated.status === 'paid' ? 'Invoice fully paid.' : 'Payment recorded.')
            }}
          />
        </Modal>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
