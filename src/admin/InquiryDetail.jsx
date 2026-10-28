import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { BackLink, ErrorState, Loader, StatusBadge } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { BUDGETS, ENGAGEMENTS, TIMELINES, dateTime, labelOf, telLink, whatsappLink } from '../lib/format.js'
import { AdminHeader, Toast } from './shared.jsx'
import { BillingBadge } from '../components/BillingDocument.jsx'
import { formatCents } from '../lib/billing.js'
import { useAdmin } from './context.js'

export default function InquiryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canManage } = useAdmin()
  const { data, error, loading, reload, setData } = useAsync((opts) => api.admin.inquiry(id, opts), [id])
  const [reply, setReply] = useState('')
  const [replyStatus, setReplyStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [toast, setToast] = useState(null)

  if (loading) return <Loader />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const { inquiry, messages, staff, options, client_link: clientLink, documents = [] } = data

  function flash(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3500)
  }

  async function update(patch) {
    setBusy(true)
    setActionError(null)
    try {
      setData(await api.admin.updateInquiry(id, patch))
      flash('Saved.')
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function sendReply(event) {
    event.preventDefault()
    if (!reply.trim()) return
    setBusy(true)
    setActionError(null)
    try {
      const result = await api.admin.replyInquiry(id, { message: reply, status: replyStatus || undefined })
      setData(result)
      setReply('')
      setReplyStatus('')
      flash(result.email_sent ? 'Reply sent and emailed to the client.' : 'Reply saved. Email is not set up, so share the client link with them.')
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete request ${inquiry.reference} and its conversation? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api.admin.deleteInquiry(id)
      navigate('/admin/inquiries', { replace: true })
    } catch (err) {
      setActionError(err)
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(clientLink)
      flash('Client link copied.')
    } catch {
      flash('Could not copy. Select the link and copy it manually.')
    }
  }

  const facts = [
    ['Type', { project: 'Project request', hire: 'Hire request', contact: 'Message' }[inquiry.kind]],
    inquiry.service && ['Service', inquiry.service.name],
    inquiry.member && ['Developer', inquiry.member.name],
    inquiry.engagement && ['Engagement', labelOf(ENGAGEMENTS, inquiry.engagement)],
    inquiry.budget_range && ['Budget', labelOf(BUDGETS, inquiry.budget_range)],
    inquiry.timeline && ['Timeline', labelOf(TIMELINES, inquiry.timeline)],
    ['Received', dateTime(inquiry.created_at)],
  ].filter(Boolean)

  const whatsapp = whatsappLink(inquiry.phone, `Hello ${inquiry.full_name.split(' ')[0]}, this is Lephas about your request ${inquiry.reference}.`)

  return (
    <div>
      <BackLink to="/admin/inquiries">All requests</BackLink>
      <AdminHeader title={inquiry.subject} actions={<StatusBadge status={inquiry.status} label={inquiry.status_label} />}>
        {inquiry.reference}
      </AdminHeader>

      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <section className="neu p-5 sm:p-7">
          <h2 className="mb-4 font-bold text-slate">Conversation</h2>
          <ol className="neu-inset max-h-[36rem] space-y-4 overflow-y-auto p-4">
            <li className="flex justify-start">
              <div className="neu-sm max-w-[85%] rounded-2xl rounded-bl-md p-4 text-sm">
                <p className="whitespace-pre-wrap text-slate">{inquiry.details}</p>
                <p className="mt-2 text-xs text-muted">{inquiry.full_name} · {dateTime(inquiry.created_at)}</p>
              </div>
            </li>
            {messages.map((m) =>
              m.sender === 'system' ? (
                <li key={m.id} className="text-center text-xs text-muted">
                  {m.body}
                  {m.author_name ? ` (${m.author_name})` : ''} · {dateTime(m.created_at)}
                </li>
              ) : (
                <li key={m.id} className={`flex ${m.sender === 'team' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-4 text-sm ${
                      m.sender === 'team' ? 'rounded-2xl rounded-br-md bg-slate text-ice' : 'neu-sm rounded-2xl rounded-bl-md text-slate'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-2 text-xs ${m.sender === 'team' ? 'text-silver' : 'text-muted'}`}>
                      {m.sender === 'team' ? m.author_name || 'Lephas team' : inquiry.full_name} · {dateTime(m.created_at)}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ol>
          <form onSubmit={sendReply} className="mt-5 space-y-3">
            <label htmlFor="team-reply" className="field-label">
              Reply to {inquiry.full_name}
            </label>
            <textarea
              id="team-reply"
              className="field resize-y"
              rows={4}
              maxLength={5000}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Your reply is shown on the client’s request page and emailed to them."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select className="field w-auto" aria-label="Status after reply" value={replyStatus} onChange={(event) => setReplyStatus(event.target.value)}>
                <option value="">Keep status (or “Waiting for client” if new)</option>
                {options.statuses.map((status) => (
                  <option key={status} value={status}>
                    Set to: {options.labels[status]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !reply.trim()}>
                Send reply
                <Icon name="send" size={16} />
              </button>
            </div>
          </form>
          {actionError && (
            <p className="field-error" role="alert">
              {actionError.message}
            </p>
          )}
        </section>

        <aside className="space-y-6">
          <div className="neu p-6">
            <p className="font-bold text-slate">{inquiry.full_name}</p>
            {inquiry.company && <p className="text-sm text-muted">{inquiry.company}</p>}
            {inquiry.country && <p className="text-sm text-muted">{inquiry.country}</p>}
            <p className="mt-3 text-xs text-muted">Prefers: {inquiry.preferred_contact}</p>
            <div className="mt-4 flex flex-col gap-2">
              <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: ${inquiry.reference}`)}`} className="btn btn-sm justify-start">
                <Icon name="mail" size={16} /> {inquiry.email}
              </a>
              {inquiry.phone && (
                <a href={telLink(inquiry.phone)} className="btn btn-sm justify-start">
                  <Icon name="call" size={16} /> {inquiry.phone}
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-sm justify-start">
                  <Icon name="whatsapp" size={16} /> WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="neu p-6 space-y-4">
            <div>
              <label htmlFor="status" className="field-label">
                Status
              </label>
              <select id="status" className="field" value={inquiry.status} disabled={busy} onChange={(event) => update({ status: event.target.value })}>
                {options.statuses.map((status) => (
                  <option key={status} value={status}>
                    {options.labels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assignee" className="field-label">
                Assigned to
              </label>
              <select
                id="assignee"
                className="field"
                value={inquiry.assigned_to?.id ?? ''}
                disabled={busy}
                onChange={(event) => update({ assigned_to: event.target.value || null })}
              >
                <option value="">Nobody</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
            <dl className="space-y-2 pt-2 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-semibold text-slate">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="neu p-6">
            <p className="font-bold text-slate">Quotes & invoices</p>
            {documents.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                {inquiry.kind === 'hire' ? 'Send a quotation first, or invoice the agreed hours directly.' : 'Send a quotation for this request.'}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <Link to={`/admin/billing/${doc.id}`} className="neu-inset-sm flex items-center justify-between gap-2 p-3 text-sm hover:text-sky-deep">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate">
                          {doc.kind === 'quote' ? 'Quotation' : 'Invoice'} {doc.number ?? '(draft)'}
                        </span>
                        <span className="block text-xs text-muted">{formatCents(doc.total_cents, doc.currency)}</span>
                      </span>
                      <BillingBadge status={doc.display_status} label={doc.status_label} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {canManage && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/admin/billing/new?inquiry=${inquiry.id}&kind=quote`} className="btn btn-sm">
                  <Icon name="plus" size={16} /> Quotation
                </Link>
                <Link to={`/admin/billing/new?inquiry=${inquiry.id}&kind=invoice`} className="btn btn-sm">
                  <Icon name="plus" size={16} /> Invoice
                </Link>
              </div>
            )}
          </div>

          {clientLink && (
            <div className="neu-inset p-5">
              <p className="text-sm font-semibold text-slate">Client’s private link</p>
              <p className="mt-1 text-xs text-muted">Send it by WhatsApp or SMS if they lost the email. Anyone with it can read this conversation.</p>
              <button type="button" className="btn btn-sm mt-3" onClick={copyLink}>
                <Icon name="copy" size={16} /> Copy link
              </button>
            </div>
          )}

          {canManage && (
            <button type="button" className="btn btn-sm btn-danger w-full" onClick={remove} disabled={busy}>
              <Icon name="trash" size={16} /> Delete request
            </button>
          )}
        </aside>
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
