import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { PageHeader, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { usePageMeta } from '../lib/useAsync.js'
import { forgetRequest, recentRequests } from '../lib/requests.js'

export default function RequestLookup() {
  usePageMeta('Track my request')
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ sending: false, message: null, error: null })
  const [saved, setSaved] = useState(() => recentRequests())

  async function submit(event) {
    event.preventDefault()
    setState({ sending: true, message: null, error: null })
    try {
      const result = await api.lookupInquiries(email)
      setState({ sending: false, message: result.message, error: null })
    } catch (error) {
      setState({ sending: false, message: null, error })
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Your requests" title="Track a request">
        Every request has a private page where you can see its status and talk with our team.
      </PageHeader>

      {saved.length > 0 && (
        <section className="neu mb-10 p-6 sm:p-8" aria-labelledby="saved-title">
          <h2 id="saved-title" className="font-bold text-slate">
            Requests sent from this device
          </h2>
          <ul className="mt-5 space-y-3">
            {saved.map((item) => (
              <li key={item.reference} className="neu-inset-sm flex items-center justify-between gap-3 p-4">
                <Link
                  to={`/requests/${item.reference}?token=${encodeURIComponent(item.token)}`}
                  className="min-w-0 flex-1 hover:text-sky-deep"
                >
                  <span className="block text-sm font-bold text-slate">{item.reference}</span>
                  {item.subject && <span className="block truncate text-xs text-muted">{item.subject}</span>}
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Remove ${item.reference} from this device`}
                  onClick={() => {
                    forgetRequest(item.reference)
                    setSaved(recentRequests())
                  }}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={submit} className="neu p-6 sm:p-8">
        <h2 className="font-bold text-slate">Lost your link?</h2>
        <p className="mt-1 text-sm text-muted">Enter the email you used and we will send the links to all your requests.</p>
        <TextInput
          className="mt-5"
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={state.error?.fields?.email}
        />
        {state.error && !state.error.fields?.email && <p className="field-error">{state.error.message}</p>}
        {state.message && (
          <p className="mt-4 text-sm font-semibold text-slate" role="status">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-6" disabled={state.sending}>
          {state.sending ? 'Sending…' : 'Email me my links'}
        </button>
      </form>
    </div>
  )
}
