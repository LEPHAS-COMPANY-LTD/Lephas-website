import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import BillingDocument from '../components/BillingDocument.jsx'
import { ErrorState, Loader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { formatCents, printDocument } from '../lib/billing.js'

export default function DocumentView() {
  const { reference, id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { data, error, loading, reload, setData } = useAsync((opts) => api.viewDocument(reference, id, token, opts), [reference, id, token])
  const doc = data?.document
  usePageMeta(doc ? `${doc.kind === 'quote' ? 'Quotation' : 'Invoice'} ${doc.number}` : 'Document')
  const [note, setNote] = useState('')
  const [state, setState] = useState({ busy: false, error: null, confirm: null })

  async function respond(decision) {
    setState({ busy: true, error: null, confirm: null })
    try {
      const result = await api.respondToQuote(reference, id, token, decision, note)
      setData((prev) => ({ ...prev, document: result.document }))
      setState({ busy: false, error: null, confirm: null })
    } catch (err) {
      setState({ busy: false, error: err, confirm: null })
    }
  }

  if (loading) return <Loader label="Opening document…" />
  if (error) return <ErrorState error={error} onRetry={error.status >= 500 ? reload : undefined} />

  const backLink = `/requests/${reference}?token=${encodeURIComponent(token)}`
  const canRespond = doc.kind === 'quote' && doc.display_status === 'sent'

  return (
    <div>
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link to={backLink} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-slate">
          <Icon name="back" size={18} />
          Back to request {reference}
        </Link>
        <div className="flex flex-wrap gap-3">
          <a
            className="btn btn-sm btn-primary"
            href={`/api/inquiries/${encodeURIComponent(reference)}/documents/${encodeURIComponent(id)}/pdf?token=${encodeURIComponent(token)}`}
            download
          >
            <Icon name="download" size={16} />
            Download PDF
          </a>
          <button type="button" className="btn btn-sm" onClick={printDocument}>
            <Icon name="receipt" size={16} />
            Print
          </button>
        </div>
      </div>

      {canRespond && (
        <section className="no-print neu mx-auto mb-10 max-w-[52rem] p-6 sm:p-8" aria-labelledby="respond-title">
          <h2 id="respond-title" className="text-lg font-bold text-slate">
            Ready to go ahead?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Accept this quotation of <strong className="text-slate">{formatCents(doc.total_cents, doc.currency)}</strong> and we will send the
            invoice and agree a start date. You can also decline and tell us what to change.
          </p>
          <label htmlFor="quote-note" className="field-label mt-5">
            Note to the team (optional)
          </label>
          <textarea id="quote-note" className="field" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          {state.error && <p className="field-error">{state.error.message}</p>}
          {state.confirm ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate">
                {state.confirm === 'accept' ? 'Accept this quotation?' : 'Decline this quotation?'}
              </span>
              <button type="button" className="btn btn-primary btn-sm" disabled={state.busy} onClick={() => respond(state.confirm)}>
                Yes, {state.confirm}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setState((s) => ({ ...s, confirm: null }))}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={() => setState((s) => ({ ...s, confirm: 'accept' }))}>
                <Icon name="check" size={18} />
                Accept quotation
              </button>
              <button type="button" className="btn" onClick={() => setState((s) => ({ ...s, confirm: 'decline' }))}>
                Decline
              </button>
            </div>
          )}
        </section>
      )}

      {doc.kind === 'quote' && ['accepted', 'declined'].includes(doc.status) && (
        <p className="no-print neu-inset mx-auto mb-8 max-w-[52rem] p-4 text-center text-sm font-semibold text-slate" role="status">
          {doc.status === 'accepted'
            ? 'You accepted this quotation. Thank you! We will be in touch with the next steps.'
            : 'You declined this quotation. Message us on your request page if you would like a revised one.'}
        </p>
      )}

      <BillingDocument document={doc} settings={data.settings} />
    </div>
  )
}
