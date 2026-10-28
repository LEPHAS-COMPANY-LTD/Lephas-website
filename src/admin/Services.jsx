import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { EmptyState, ErrorState, Loader, Select, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { priceLabel } from '../lib/format.js'
import { useSite } from '../context/site.js'
import { AdminHeader, Modal, TagInput, Toast, Toggle } from './shared.jsx'
import { emptyToNull } from './utils.js'
import { useAdmin } from './context.js'

const ICONS = ['globe', 'cart', 'user', 'layout', 'phone', 'receipt', 'server', 'pen', 'wrench', 'code', 'shield', 'rocket']
const EMPTY = { name: '', slug: '', category: '', summary: '', description: '', starting_price: '', price_unit: 'project', delivery_estimate: '', features: [], icon: 'code', sort_order: 0, active: true }

function ServiceForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial, starting_price: initial?.starting_price ?? '', delivery_estimate: initial?.delivery_estimate ?? '' }))
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ saving: false, error: null })
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event?.target ? event.target.value : event }))

  async function submit(event) {
    event.preventDefault()
    setState({ saving: true, error: null })
    try {
      const payload = emptyToNull({
        ...form,
        starting_price: form.starting_price === '' ? '' : Number(form.starting_price),
        sort_order: Number(form.sort_order) || 0,
      })
      const result = await api.admin.saveService(initial?.id, payload)
      onSaved(result.service)
    } catch (error) {
      setErrors(error.fields || {})
      setState({ saving: false, error })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Name" required value={form.name} onChange={set('name')} error={errors.name} />
        <TextInput label="Category" required placeholder="Websites, Apps, Systems…" value={form.category} onChange={set('category')} error={errors.category} />
      </div>
      <TextInput label="Short summary" required value={form.summary} onChange={set('summary')} error={errors.summary} maxLength={240} />
      <TextArea label="Description" rows={4} value={form.description} onChange={set('description')} error={errors.description} />
      <TagInput label="Key features" value={form.features} onChange={set('features')} placeholder="e.g. Mobile-first design" error={errors.features} />
      <div className="grid gap-5 sm:grid-cols-3">
        <TextInput label="Starting price" type="number" min={0} hint="Leave empty for “Custom quote”" value={form.starting_price} onChange={set('starting_price')} error={errors.starting_price} />
        <Select label="Per" options={[{ value: 'project', label: 'Project' }, { value: 'hour', label: 'Hour' }, { value: 'month', label: 'Month' }]} value={form.price_unit} onChange={set('price_unit')} />
        <TextInput label="Typical delivery" placeholder="2 to 4 weeks" value={form.delivery_estimate} onChange={set('delivery_estimate')} error={errors.delivery_estimate} />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <TextInput label="Link name (slug)" hint="Made from the name if empty" value={form.slug} onChange={set('slug')} error={errors.slug} />
        <Select label="Icon" options={ICONS.map((icon) => ({ value: icon, label: icon }))} value={form.icon} onChange={set('icon')} />
        <TextInput label="Order" type="number" min={0} value={form.sort_order} onChange={set('sort_order')} error={errors.sort_order} />
      </div>
      <Toggle label="Show on the website" checked={form.active} onChange={set('active')} />
      {state.error && !Object.keys(state.error.fields || {}).length && <p className="field-error">{state.error.message}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save service'}
        </button>
      </div>
    </form>
  )
}

export default function Services() {
  const { canManage } = useAdmin()
  const { settings } = useSite()
  const { data, error, loading, reload } = useAsync((opts) => api.admin.services(opts), [])
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  async function remove(service) {
    if (!window.confirm(`Delete the service “${service.name}”? Requests and projects that used it will keep their history.`)) return
    try {
      await api.admin.deleteService(service.id)
      setToast('Service deleted.')
      reload()
    } catch (err) {
      setToast(err.message)
    }
  }

  return (
    <div>
      <AdminHeader
        title="Services"
        actions={
          canManage && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
              <Icon name="plus" size={16} /> Add service
            </button>
          )
        }
      >
        What clients can request on the website.
      </AdminHeader>
      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.services.length === 0 && <EmptyState title="No services yet">Add the services Lephas offers.</EmptyState>}
      <ul className="grid gap-4 md:grid-cols-2">
        {(data?.services ?? []).map((service) => (
          <li key={service.id} className="neu-sm flex items-start gap-4 p-5">
            <span className="icon-well h-11 w-11 shrink-0">
              <Icon name={service.icon} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate">
                {service.name} {!service.active && <span className="chip ml-1">Hidden</span>}
              </p>
              <p className="text-xs text-muted">
                {service.category} · {priceLabel(service, settings.currency)}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{service.summary}</p>
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-2">
                <button type="button" className="btn btn-sm h-9 w-9 p-0" aria-label={`Edit ${service.name}`} onClick={() => setEditing(service)}>
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" className="btn btn-sm btn-danger h-9 w-9 p-0" aria-label={`Delete ${service.name}`} onClick={() => remove(service)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? `Edit ${editing.name}` : 'Add a service'} onClose={() => setEditing(null)} wide>
          <ServiceForm
            initial={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              setToast('Service saved.')
              reload()
            }}
          />
        </Modal>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
