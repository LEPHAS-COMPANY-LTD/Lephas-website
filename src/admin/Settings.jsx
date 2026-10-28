import { useState } from 'react'
import { ErrorState, Loader, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { AdminHeader, Toast } from './shared.jsx'
import { useAdmin } from './context.js'

const GROUPS = [
  {
    title: 'How clients reach you',
    fields: [
      { key: 'contact_email', label: 'Contact email', type: 'email', placeholder: 'hello@lephas.com' },
      { key: 'contact_phone', label: 'Phone number', type: 'tel', placeholder: '+254 700 000 000' },
      { key: 'whatsapp_number', label: 'WhatsApp number', type: 'tel', placeholder: '+254 700 000 000', hint: 'Shows the floating “Chat with us” button.' },
      { key: 'office_address', label: 'Office address', placeholder: 'City, Country' },
      { key: 'business_hours', label: 'Business hours', placeholder: 'Mon to Fri, 8:00 to 18:00' },
      { key: 'currency', label: 'Currency', placeholder: 'USD', hint: 'Used for prices, rates and budgets. 3-letter code.' },
      { key: 'data_protection_registration', label: 'Data protection registration number', placeholder: 'Leave empty until registered', hint: 'Shown on the privacy policy once filled in.' },
    ],
  },
  {
    title: 'Quotes & invoices',
    fields: [
      { key: 'tax_number', label: 'Tax / registration number', placeholder: 'e.g. KRA PIN or VAT number' },
      { key: 'invoice_due_days', label: 'Days to pay an invoice', type: 'number', placeholder: '14' },
      { key: 'default_tax_label', label: 'Tax name', placeholder: 'VAT' },
      { key: 'default_tax_rate', label: 'Default tax rate (%)', type: 'number', placeholder: '0' },
      { key: 'payment_instructions', label: 'Payment instructions', multiline: true, wide: true, placeholder: 'Bank: …\nAccount name: Lephas Company Ltd\nAccount number: …\nM-Pesa Paybill: …', hint: 'Printed on every invoice.' },
      { key: 'invoice_terms', label: 'Default invoice terms', multiline: true },
      { key: 'quote_terms', label: 'Default quotation terms', multiline: true },
    ],
  },
  {
    title: 'Social links',
    fields: [
      { key: 'linkedin_url', label: 'LinkedIn', type: 'url', placeholder: 'https://www.linkedin.com/company/…' },
      { key: 'github_url', label: 'GitHub', type: 'url', placeholder: 'https://github.com/…' },
      { key: 'x_url', label: 'X (Twitter)', type: 'url', placeholder: 'https://x.com/…' },
      { key: 'instagram_url', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/…' },
      { key: 'facebook_url', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/…' },
    ],
  },
]

export default function Settings() {
  const { isCto } = useAdmin()
  const { data, error, loading, reload } = useAsync((opts) => api.admin.settings(opts), [])
  const [draft, setForm] = useState(null)
  const form = draft ?? data?.settings ?? null
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ saving: false, error: null })
  const [toast, setToast] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setState({ saving: true, error: null })
    setErrors({})
    try {
      const result = await api.admin.saveSettings(form)
      setForm(result.settings)
      setState({ saving: false, error: null })
      setToast('Settings saved. Refresh the website to see them.')
    } catch (err) {
      setErrors(err.fields || {})
      setState({ saving: false, error: err })
    }
  }

  if (loading || !form) return error ? <ErrorState error={error} onRetry={reload} /> : <Loader />

  return (
    <div>
      <AdminHeader title="Contact settings">
        {isCto ? 'These details appear across the website, in the footer and on the contact page.' : 'Only the CTO can change these details.'}
      </AdminHeader>
      <form onSubmit={submit} className="space-y-8" noValidate>
        {GROUPS.map((group) => (
          <fieldset key={group.title} className="neu p-6 sm:p-8" disabled={!isCto}>
            <legend className="sr-only">{group.title}</legend>
            <p className="mb-6 font-bold text-slate">{group.title}</p>
            <div className="grid gap-5 md:grid-cols-2">
              {group.fields.map((field) =>
                field.multiline ? (
                  <TextArea
                    key={field.key}
                    className={field.wide ? 'md:col-span-2' : ''}
                    label={field.label}
                    rows={field.wide ? 5 : 3}
                    placeholder={field.placeholder}
                    hint={field.hint}
                    value={form[field.key] ?? ''}
                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                    error={errors[field.key]}
                  />
                ) : (
                <TextInput
                  key={field.key}
                  label={field.label}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  hint={field.hint}
                  value={form[field.key] ?? ''}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  error={errors[field.key]}
                />
                ),
              )}
            </div>
          </fieldset>
        ))}
        {state.error && !Object.keys(state.error.fields || {}).length && <p className="field-error">{state.error.message}</p>}
        {isCto && (
          <button type="submit" className="btn btn-primary" disabled={state.saving}>
            {state.saving ? 'Saving…' : 'Save settings'}
          </button>
        )}
      </form>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
