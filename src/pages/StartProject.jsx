import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Avatar, ErrorState, Loader, Select, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { BUDGETS, ENGAGEMENTS, TIMELINES, labelOf, money } from '../lib/format.js'
import { useSite } from '../context/site.js'
import { rememberRequest } from '../lib/requests.js'

const STEP_FIELDS = [
  ['service_id', 'team_member_slug'],
  ['engagement', 'budget_range', 'timeline', 'subject', 'details'],
  ['full_name', 'email', 'phone', 'company', 'country', 'preferred_contact'],
]

const CONTACT_OPTIONS = [
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { value: 'phone', label: 'Phone call', icon: 'call' },
]

export default function StartProject() {
  usePageMeta('Start a project', 'Tell Lephas what you need and get a reply with a plan and quote within one business day.')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { settings } = useSite()
  const hireSlug = params.get('hire')
  const services = useAsync((opts) => api.services(opts), [])
  const member = useAsync((opts) => (hireSlug ? api.member(hireSlug, opts) : Promise.resolve(null)), [hireSlug])

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    service_id: '',
    engagement: hireSlug ? 'hourly' : '',
    budget_range: '',
    timeline: '',
    subject: '',
    details: '',
    full_name: '',
    email: '',
    phone: '',
    company: '',
    country: '',
    preferred_contact: 'email',
    website: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const serviceList = useMemo(() => services.data?.services ?? [], [services.data])
  const presetServiceId = serviceList.find((service) => service.slug === params.get('service'))?.id ?? ''
  const serviceId = form.service_id === null ? '' : form.service_id || presetServiceId
  const selectedService = serviceList.find((service) => service.id === serviceId)
  const hiring = hireSlug ? member.data?.member : null


  const set = (key) => (event) => {
    const value = event?.target ? event.target.value : event
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(index) {
    const found = {}
    if (index === 0 && !hireSlug && !serviceId) found.service_id = 'Choose the service you need.'
    if (index === 1) {
      if (form.details.trim().length < 20) found.details = 'Describe your project in at least 20 characters.'
    }
    if (index === 2) {
      if (form.full_name.trim().length < 2) found.full_name = 'Enter your name.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = 'Enter a valid email address.'
      if (form.preferred_contact !== 'email' && !form.phone.trim()) found.phone = 'Add a phone number so we can reach you that way.'
    }
    setErrors(found)
    return Object.keys(found).length === 0
  }

  function next() {
    if (validate(step)) setStep((s) => s + 1)
  }

  async function submit(event) {
    event.preventDefault()
    if (!validate(2)) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = {
        kind: hireSlug ? 'hire' : 'project',
        ...form,
        service_id: serviceId || undefined,
        team_member_slug: hireSlug || undefined,
        engagement: form.engagement || undefined,
        budget_range: form.budget_range || undefined,
        timeline: form.timeline || undefined,
      }
      const result = await api.submitInquiry(payload)
      if (result.token) {
        rememberRequest({ reference: result.reference, token: result.token, subject: payload.subject || selectedService?.name || hiring?.full_name })
        navigate(`/requests/${result.reference}?token=${encodeURIComponent(result.token)}`, { state: { created: true } })
      }
    } catch (error) {
      setSubmitError(error)
      if (error.fields && Object.keys(error.fields).length > 0) {
        setErrors(error.fields)
        const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => error.fields[field]))
        if (firstStep >= 0) setStep(firstStep)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (services.loading || member.loading) return <Loader />
  if (hireSlug && member.error) return <ErrorState error={member.error} />

  const steps = [hireSlug ? 'Who' : 'Service', 'Project', 'Your details']

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 text-center">
        <span className="eyebrow">{hireSlug ? 'Hire talent' : 'Start a project'}</span>
        <h1 className="mt-3 text-3xl font-bold text-slate sm:text-4xl">
          {hireSlug ? `Hire ${hiring?.full_name ?? 'a developer'}` : 'Tell us what you need'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">Takes about three minutes. We reply within one business day.</p>
      </header>

      <ol className="mb-10 grid grid-cols-3 gap-3 sm:gap-5" aria-label="Progress">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={index > step}
              onClick={() => index < step && setStep(index)}
              aria-current={index === step ? 'step' : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-semibold ${
                index === step ? 'neu-inset-sm text-slate' : 'neu-sm text-muted'
              } disabled:cursor-default`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
                  index < step ? 'bg-slate text-ice' : index === step ? 'bg-sky text-navy' : 'bg-silver text-slate'
                }`}
              >
                {index < step ? <Icon name="check" size={16} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <form className="neu-lg p-6 sm:p-10" onSubmit={(event) => {
          if (step === 2) return submit(event)
          event.preventDefault()
          next()
        }} noValidate>
        <div className="sr-only" aria-hidden="true">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </label>
        </div>

        {step === 0 && (
          <fieldset>
            {hireSlug && hiring ? (
              <>
                <legend className="mb-6 text-xl font-bold text-slate">You are hiring</legend>
                <div className="neu-inset flex flex-col items-center gap-5 p-6 sm:flex-row">
                  <Avatar src={hiring.photo} name={hiring.full_name} size={88} />
                  <div className="text-center sm:text-left">
                    <p className="text-lg font-bold text-slate">{hiring.full_name}</p>
                    <p className="text-sm text-sky-deep">{hiring.title}</p>
                    {hiring.hourly_rate !== null && (
                      <p className="mt-1 text-sm text-muted">{money(hiring.hourly_rate, settings.currency)} / hour</p>
                    )}
                    <ul className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      {hiring.skills.slice(0, 6).map((skill) => (
                        <li key={skill} className="chip">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to="/talent" className="btn btn-sm sm:ml-auto">
                    Change
                  </Link>
                </div>
                {serviceList.length > 0 && (
                  <Select
                    className="mt-8"
                    label="What will they work on? (optional)"
                    placeholder="Choose a service"
                    options={serviceList.map((s) => ({ value: s.id, label: s.name }))}
                    value={serviceId}
                    onChange={(event) => set('service_id')(event.target.value || null)}
                  />
                )}
              </>
            ) : (
              <>
                <legend className="mb-6 text-xl font-bold text-slate">What do you need built?</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Service">
                  {serviceList.map((service) => {
                    const active = serviceId === service.id
                    return (
                      <button
                        key={service.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => set('service_id')(service.id)}
                        className={`flex items-start gap-3 rounded-2xl p-4 text-left transition ${
                          active ? 'neu-inset ring-2 ring-sky' : 'neu-sm hover:text-sky-deep'
                        }`}
                      >
                        <Icon name={service.icon} className="mt-0.5 shrink-0 text-sky-deep" />
                        <span>
                          <span className="block text-sm font-bold text-slate">{service.name}</span>
                          <span className="mt-1 block text-xs text-muted">{service.summary}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                {errors.service_id && <p className="field-error mt-4">{errors.service_id}</p>}
                <p className="mt-6 text-sm text-muted">
                  Something else? Pick the closest option and describe it in the next step, or{' '}
                  <Link to="/contact" className="font-semibold text-sky-deep underline">
                    just send us a message
                  </Link>
                  .
                </p>
              </>
            )}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="space-y-7">
            <legend className="mb-2 text-xl font-bold text-slate">Tell us about the project</legend>
            <div>
              <p className="field-label">How would you like to work with us?</p>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Engagement">
                {ENGAGEMENTS.map((option) => {
                  const active = form.engagement === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set('engagement')(option.value)}
                      className={`rounded-2xl p-4 text-left ${active ? 'neu-inset ring-2 ring-sky' : 'neu-sm'}`}
                    >
                      <span className="block text-sm font-bold text-slate">{option.label}</span>
                      <span className="mt-1 block text-xs text-muted">{option.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Select
                label={`Budget (${settings.currency})`}
                placeholder="Select a range"
                options={BUDGETS}
                value={form.budget_range}
                onChange={set('budget_range')}
                error={errors.budget_range}
              />
              <Select
                label="Timeline"
                placeholder="When do you need it?"
                options={TIMELINES}
                value={form.timeline}
                onChange={set('timeline')}
                error={errors.timeline}
              />
            </div>
            <TextInput
              label="Project name (optional)"
              placeholder="e.g. Online shop for my bakery"
              value={form.subject}
              onChange={set('subject')}
              maxLength={160}
              error={errors.subject}
            />
            <TextArea
              label="Describe what you need"
              required
              rows={7}
              placeholder="What should it do? Who will use it? Any websites you like, features you need or deadlines?"
              value={form.details}
              onChange={set('details')}
              maxLength={5000}
              error={errors.details}
              hint={`${form.details.trim().length} / 5000 characters`}
            />
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-6">
            <legend className="mb-2 text-xl font-bold text-slate">How can we reach you?</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              <TextInput label="Full name" required autoComplete="name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
              <TextInput label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
              <TextInput
                label="Phone / WhatsApp"
                type="tel"
                autoComplete="tel"
                placeholder="+254 700 000 000"
                value={form.phone}
                onChange={set('phone')}
                error={errors.phone}
              />
              <TextInput label="Company (optional)" autoComplete="organization" value={form.company} onChange={set('company')} error={errors.company} />
              <TextInput label="Country (optional)" autoComplete="country-name" value={form.country} onChange={set('country')} error={errors.country} />
            </div>
            <div>
              <p className="field-label">Best way to contact you</p>
              <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Preferred contact">
                {CONTACT_OPTIONS.map((option) => {
                  const active = form.preferred_contact === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set('preferred_contact')(option.value)}
                      className={`btn btn-sm ${active ? 'chip-active' : ''}`}
                    >
                      <Icon name={option.icon} size={18} />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="neu-inset p-5 text-sm text-muted">
              <p className="font-semibold text-slate">Summary</p>
              <p className="mt-2">
                {hiring ? `Hiring ${hiring.full_name}` : selectedService?.name}
                {form.engagement && ` · ${labelOf(ENGAGEMENTS, form.engagement)}`}
                {form.budget_range && ` · ${labelOf(BUDGETS, form.budget_range)} ${settings.currency}`}
                {form.timeline && ` · ${labelOf(TIMELINES, form.timeline)}`}
              </p>
            </div>
          </fieldset>
        )}

        {submitError && !Object.keys(submitError.fields || {}).length && (
          <p className="field-error mt-6" role="alert">
            {submitError.message}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          {step > 0 ? (
            <button type="button" className="btn" onClick={() => setStep((s) => s - 1)}>
              <Icon name="back" size={18} />
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button type="submit" className="btn btn-primary">
              Continue
              <Icon name="arrow" size={18} />
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send request'}
              {!submitting && <Icon name="send" size={18} />}
            </button>
          )}
        </div>
      </form>
      <p className="mt-6 text-center text-xs text-muted">
        We only use your details to reply to this request. No spam, ever.
      </p>
    </div>
  )
}
