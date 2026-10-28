import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { EmptyState, ErrorState, Loader, StatusBadge } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { dateTime } from '../lib/format.js'
import { AdminHeader } from './shared.jsx'

const KIND_LABELS = { project: 'Project', hire: 'Hire', contact: 'Message' }

export default function Inquiries() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const kind = params.get('kind') || ''
  const q = params.get('q') || ''
  const [search, setSearch] = useState(q)
  const { data, error, loading, reload } = useAsync((opts) => api.admin.inquiries({ status, kind, q }, opts), [status, kind, q])

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

  const statuses = data?.statuses ?? []
  const labels = data?.labels ?? {}

  return (
    <div>
      <AdminHeader title="Client requests">Project requests, hire requests and messages from the website.</AdminHeader>
      <div className="neu mb-6 grid gap-4 p-4 md:grid-cols-[1.5fr_1fr_1fr]">
        <label className="neu-inset-sm flex items-center gap-3 px-4">
          <Icon name="search" size={18} className="text-muted" />
          <span className="sr-only">Search</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-sm outline-none"
            placeholder="Name, email, reference or subject"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select className="field" aria-label="Status" value={status} onChange={(event) => update('status', event.target.value)}>
          <option value="">All statuses</option>
          <option value="open">All open</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {labels[value]}
            </option>
          ))}
        </select>
        <select className="field" aria-label="Type" value={kind} onChange={(event) => update('kind', event.target.value)}>
          <option value="">All types</option>
          <option value="project">Project requests</option>
          <option value="hire">Hire requests</option>
          <option value="contact">Messages</option>
        </select>
      </div>

      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.inquiries.length === 0 && (
        <EmptyState icon="inbox" title="No requests found">
          New requests from the website will appear here.
        </EmptyState>
      )}
      {data && data.inquiries.length > 0 && (
        <ul className="space-y-3">
          {data.inquiries.map((item) => (
            <li key={item.id}>
              <Link to={`/admin/inquiries/${item.id}`} className="neu-sm neu-hover grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    {item.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky" aria-label="Unread reply" />}
                    <span className="truncate font-semibold text-slate">{item.subject}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {item.reference} · {KIND_LABELS[item.kind]} · {item.full_name} ({item.email})
                    {item.service ? ` · ${item.service.name}` : ''}
                    {item.member ? ` · ${item.member.name}` : ''}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  {item.assigned_to && <span>{item.assigned_to.name}</span>}
                  <span>{dateTime(item.last_message_at || item.created_at)}</span>
                  <StatusBadge status={item.status} label={item.status_label} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
