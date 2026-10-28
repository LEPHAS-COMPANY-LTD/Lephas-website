import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import ContactChannels from '../components/ContactChannels.jsx'
import { ErrorState, Loader, StatusBadge } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { BUDGETS, ENGAGEMENTS, TIMELINES, dateTime, labelOf } from '../lib/format.js'
import { rememberRequest } from '../lib/requests.js'
import { BILLING_TONES, formatCents } from '../lib/billing.js'

export default function RequestStatus() {
  const { reference } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const token = params.get('token') || ''
  usePageMeta(`Request ${reference}`)
  const { data, error, loading, reload, setData } = useAsync((opts) => api.viewInquiry(reference, token, opts), [reference, token])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [copied, setCopied] = useState(false)
  const endRef = useRef(null)
  const request = data?.request

  useEffect(() => {
    if (request) rememberRequest({ reference: request.reference, token, subject: request.subject })
  }, [request, token])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        api.viewInquiry(reference, token).then(setData).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [reference, token, setData])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [request?.messages.length])

  async function send(event) {
    event.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setSendError(null)
    try {
      setData(await api.replyToInquiry(reference, token, message))
      setMessage('')
    } catch (err) {
      setSendError(err)
    } finally {
      setSending(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  if (loading) return <Loader label="Opening your request…" />
  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <ErrorState error={error} onRetry={error.status >= 500 || error.status === 0 ? reload : undefined} />
        <Link to="/requests" className="btn">
          Find my request links
        </Link>
      </div>
    )
  }

  const details = [
    request.service && ['Service', request.service],
    request.member && ['Developer', request.member.name],
    request.engagement && ['Engagement', labelOf(ENGAGEMENTS, request.engagement)],
    request.budget_range && ['Budget', labelOf(BUDGETS, request.budget_range)],
    request.timeline && ['Timeline', labelOf(TIMELINES, request.timeline)],
    ['Sent', dateTime(request.created_at)],
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-5xl">
      {location.state?.created && (
        <div className="neu mb-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center" role="status">
          <span className="icon-well shrink-0">
            <Icon name="check" />
          </span>
          <div className="flex-1">
            <p className="font-bold text-slate">Thank you! Your request {request.reference} has been sent.</p>
            <p className="text-sm text-muted">
              Bookmark this page or copy the link. It is your private page to follow progress and talk with our team.
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={copyLink}>
            <Icon name="copy" size={18} />
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Request {request.reference}</span>
          <h1 className="mt-2 text-2xl font-bold text-slate sm:text-3xl">{request.subject || 'Your request'}</h1>
        </div>
        <StatusBadge status={request.status} label={request.status_label} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_19rem]">
        <section className="neu flex flex-col p-5 sm:p-7" aria-labelledby="thread-title">
          <h2 id="thread-title" className="mb-5 font-bold text-slate">
            Conversation
          </h2>
          <ol className="neu-inset max-h-[32rem] flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
            <li className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate p-4 text-sm text-ice">
                <p className="whitespace-pre-wrap">{request.details}</p>
                <p className="mt-2 text-xs text-silver">You · {dateTime(request.created_at)}</p>
              </div>
            </li>
            {request.messages.map((m) =>
              m.sender === 'system' ? (
                <li key={m.id} className="text-center text-xs text-muted">
                  {m.body} · {dateTime(m.created_at)}
                </li>
              ) : (
                <li key={m.id} className={`flex ${m.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-4 text-sm ${
                      m.sender === 'client' ? 'rounded-2xl rounded-br-md bg-slate text-ice' : 'neu-sm rounded-2xl rounded-bl-md text-slate'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-2 text-xs ${m.sender === 'client' ? 'text-silver' : 'text-muted'}`}>
                      {m.sender === 'client' ? 'You' : m.author} · {dateTime(m.created_at)}
                    </p>
                  </div>
                </li>
              ),
            )}
            <li ref={endRef} aria-hidden="true" />
          </ol>
          <form onSubmit={send} className="mt-5">
            <label htmlFor="reply" className="field-label">
              Send a message to the Lephas team
            </label>
            <textarea
              id="reply"
              className="field resize-y"
              rows={3}
              maxLength={5000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your message…"
            />
            {sendError && (
              <p className="field-error" role="alert">
                {sendError.message}
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !message.trim()}>
                {sending ? 'Sending…' : 'Send'}
                {!sending && <Icon name="send" size={16} />}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <div className="neu p-6">
            <p className="font-bold text-slate">Request details</p>
            <dl className="mt-4 space-y-3 text-sm">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="font-semibold text-slate">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {request.documents?.length > 0 && (
            <div className="neu p-6">
              <p className="font-bold text-slate">Quotations & invoices</p>
              <ul className="mt-4 space-y-3">
                {request.documents.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      to={`/requests/${request.reference}/documents/${doc.id}?token=${encodeURIComponent(token)}`}
                      className="neu-inset-sm block p-4 hover:text-sky-deep"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate">
                          {doc.kind === 'quote' ? 'Quotation' : 'Invoice'} {doc.number}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${BILLING_TONES[doc.display_status] ?? ''}`}>
                          {doc.status_label}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-muted">{doc.title}</span>
                      <span className="mt-1 block text-sm font-semibold text-slate">
                        {formatCents(doc.kind === 'invoice' && doc.paid_cents > 0 ? doc.balance_cents : doc.total_cents, doc.currency)}
                        {doc.kind === 'invoice' && doc.paid_cents > 0 ? ' due' : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="neu p-6">
            <p className="mb-4 font-bold text-slate">Prefer to talk?</p>
            <ContactChannels layout="column" message={`Hello Lephas, about my request ${request.reference}.`} />
            <p className="mt-4 text-xs text-muted">Mention your reference {request.reference} so we can find it quickly.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
