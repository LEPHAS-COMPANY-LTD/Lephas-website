import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { BillingBadge } from '../components/BillingDocument.jsx'
import { EmptyState, ErrorState, Loader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { formatCents, longDate } from '../lib/billing.js'
import { AdminHeader } from './shared.jsx'

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent / unpaid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'accepted', label: 'Accepted quotes' },
  { value: 'declined', label: 'Declined quotes' },
  { value: 'void', label: 'Void' },
]

export default function Billing() {
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') || ''
  const status = params.get('status') || ''
  const q = params.get('q') || ''
  const [search, setSearch] = useState(q)
  const { data, error, loading, reload } = useAsync((opts) => api.admin.billing({ kind, status, q }, opts), [kind, status, q])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== q) update('q', search)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const outstanding = Object.entries(data?.outstanding ?? {})

  return (
    <div>
      <AdminHeader title="Quotes & invoices">Create them from a client request, then send, track acceptance and record payments.</AdminHeader>

      {outstanding.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outstanding.map(([currency, cents]) => (
            <div key={currency} className="neu flex items-center gap-4 p-5">
              <span className="icon-well">
                <Icon name="receipt" />
              </span>
              <span>
                <span className="block text-xl font-bold text-slate">{formatCents(cents, currency)}</span>
                <span className="block text-xs text-muted">Outstanding on invoices</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="neu mb-6 grid gap-4 p-4 md:grid-cols-[1.5fr_1fr_1fr]">
        <label className="neu-inset-sm flex items-center gap-3 px-4">
          <Icon name="search" size={18} className="text-muted" />
          <span className="sr-only">Search</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-sm outline-none"
            placeholder="Number, client, title or request"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select className="field" aria-label="Type" value={kind} onChange={(event) => update('kind', event.target.value)}>
          <option value="">Quotes and invoices</option>
          <option value="quote">Quotations</option>
          <option value="invoice">Invoices</option>
        </select>
        <select className="field" aria-label="Status" value={status} onChange={(event) => update('status', event.target.value)}>
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.documents.length === 0 && (
        <EmptyState
          icon="receipt"
          title="No quotes or invoices yet"
          action={
            <Link to="/admin/inquiries" className="btn">
              Open client requests
            </Link>
          }
        >
          Open a client request and press “Create quotation” or “Create invoice”.
        </EmptyState>
      )}
      {data && data.documents.length > 0 && (
        <ul className="space-y-3">
          {data.documents.map((doc) => (
            <li key={doc.id}>
              <Link to={`/admin/billing/${doc.id}`} className="neu-sm neu-hover grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate">
                    {doc.kind === 'quote' ? 'Quotation' : 'Invoice'} {doc.number ?? '(draft)'} · {doc.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {doc.client_name} · {doc.reference} · issued {longDate(doc.issue_date)}
                    {doc.due_date ? ` · ${doc.kind === 'quote' ? 'valid until' : 'due'} ${longDate(doc.due_date)}` : ''}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-slate">{formatCents(doc.total_cents, doc.currency)}</span>
                  {doc.kind === 'invoice' && doc.paid_cents > 0 && doc.balance_cents > 0 && (
                    <span className="text-xs text-muted">{formatCents(doc.balance_cents, doc.currency)} due</span>
                  )}
                  <BillingBadge status={doc.display_status} label={doc.status_label} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
