import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import ContactChannels from '../components/ContactChannels.jsx'
import { PageHeader, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { usePageMeta } from '../lib/useAsync.js'
import { useSite } from '../context/site.js'
import { rememberRequest } from '../lib/requests.js'

export default function Contact() {
  usePageMeta('Contact', 'Message Lephas, call us or chat on WhatsApp. We reply within one business day.')
  const { settings } = useSite()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const about = params.get('about')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    preferred_contact: 'email',
    subject: about ? `Question about ${about}` : '',
    details: '',
    website: '',
  })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ sending: false, error: null })

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const found = {}
    if (form.full_name.trim().length < 2) found.full_name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = 'Enter a valid email address.'
    if (form.details.trim().length < 20) found.details = 'Write at least 20 characters so we can help.'
    if (form.preferred_contact !== 'email' && !form.phone.trim()) found.phone = 'Add a phone number so we can reach you that way.'
    setErrors(found)
    if (Object.keys(found).length) return
    setState({ sending: true, error: null })
    try {
      const result = await api.submitInquiry({ kind: 'contact', ...form })
      if (result.token) {
        rememberRequest({ reference: result.reference, token: result.token, subject: form.subject || 'Message' })
        navigate(`/requests/${result.reference}?token=${encodeURIComponent(result.token)}`, { state: { created: true } })
      }
    } catch (error) {
      setErrors(error.fields || {})
      setState({ sending: false, error })
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Contact" title="Let’s talk">
        Ask a question, request a call or send an idea. Every message gets a reference number and a private page to
        continue the conversation.
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={submit} className="neu-lg space-y-6 p-6 sm:p-10" noValidate>
          <div className="sr-only" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </label>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextInput label="Full name" required autoComplete="name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
            <TextInput label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
            <TextInput label="Phone / WhatsApp" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <div>
              <label htmlFor="contact-pref" className="field-label">
                Reply to me by
              </label>
              <select id="contact-pref" className="field" value={form.preferred_contact} onChange={set('preferred_contact')}>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone call</option>
              </select>
            </div>
          </div>
          <TextInput label="Subject" value={form.subject} onChange={set('subject')} maxLength={160} error={errors.subject} />
          <TextArea label="Message" required rows={6} value={form.details} onChange={set('details')} maxLength={5000} error={errors.details} />
          {state.error && !Object.keys(state.error.fields || {}).length && (
            <p className="field-error" role="alert">
              {state.error.message}
            </p>
          )}
          <p className="text-xs text-muted">
            By sending this message you agree to our{' '}
            <Link to="/privacy" className="font-semibold underline">
              privacy policy
            </Link>
            .
          </p>
          <button type="submit" className="btn btn-primary" disabled={state.sending}>
            {state.sending ? 'Sending…' : 'Send message'}
            {!state.sending && <Icon name="send" size={18} />}
          </button>
        </form>

        <aside className="space-y-8">
          <div className="neu p-6 sm:p-8">
            <p className="text-lg font-bold text-slate">Reach us directly</p>
            <div className="mt-5">
              <ContactChannels layout="column" />
            </div>
            {!settings.contact_email && !settings.whatsapp_number && !settings.contact_phone && (
              <p className="text-sm text-muted">Use the form and we will reply by your preferred channel.</p>
            )}
            {(settings.office_address || settings.business_hours) && (
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {settings.office_address && (
                  <li className="flex gap-3">
                    <Icon name="map" size={18} className="mt-0.5 shrink-0 text-sky-deep" /> {settings.office_address}
                  </li>
                )}
                {settings.business_hours && (
                  <li className="flex gap-3">
                    <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-sky-deep" /> {settings.business_hours}
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="neu-inset p-6 sm:p-8">
            <p className="font-bold text-slate">Have a project in mind?</p>
            <p className="mt-2 text-sm text-muted">The project form helps us give you an accurate quote faster.</p>
            <Link to="/start" className="btn mt-5">
              Start a project
            </Link>
          </div>
          <div className="neu-inset p-6 sm:p-8">
            <p className="font-bold text-slate">Already sent a request?</p>
            <Link to="/requests" className="btn mt-4">
              Track my request
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
