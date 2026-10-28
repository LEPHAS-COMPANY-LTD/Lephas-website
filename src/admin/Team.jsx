import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Avatar, EmptyState, ErrorState, Loader, Select, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { useSite } from '../context/site.js'
import { AdminHeader, ImageUpload, Modal, TagInput, Toast, Toggle } from './shared.jsx'
import { emptyToNull } from './utils.js'

const EMPTY = {
  full_name: '', slug: '', title: '', member_type: 'employee', headline: '', bio: '', photo_media_id: null, photo_url: '',
  location: '', years_experience: '', hourly_rate: '', availability: 'available', skills: [], languages: [],
  github_url: '', linkedin_url: '', portfolio_url: '', website_url: '', sort_order: 0, published: false,
}

function MemberForm({ initial, onSaved, onCancel }) {
  const { settings } = useSite()
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY }
    for (const key of Object.keys(EMPTY)) {
      if (initial && initial[key] !== null && initial[key] !== undefined) base[key] = initial[key]
    }
    return base
  })
  const [preview, setPreview] = useState(initial?.photo ?? null)
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ saving: false, error: null })
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event?.target ? event.target.value : event }))

  async function submit(event) {
    event.preventDefault()
    setState({ saving: true, error: null })
    try {
      const payload = {
        ...form,
        years_experience: form.years_experience === '' ? '' : Number(form.years_experience),
        hourly_rate: form.hourly_rate === '' ? '' : Number(form.hourly_rate),
        sort_order: Number(form.sort_order) || 0,
      }
      const result = await api.admin.saveMember(initial?.id, emptyToNull(payload))
      onSaved(result.member)
    } catch (error) {
      setErrors(error.fields || {})
      setState({ saving: false, error })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <ImageUpload
        label="Profile photo"
        round
        maxSize={600}
        preview={preview || form.photo_url || null}
        onUploaded={(result) => {
          setForm((prev) => ({ ...prev, photo_media_id: result.id, photo_url: '' }))
          setPreview(result.url)
        }}
        onClear={() => {
          setForm((prev) => ({ ...prev, photo_media_id: null, photo_url: '' }))
          setPreview(null)
        }}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Full name" required value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
        <TextInput label="Job title" required placeholder="Full-stack developer" value={form.title} onChange={set('title')} error={errors.title} />
        <Select
          label="Role in the company"
          options={[
            { value: 'owner', label: 'Owner / co-founder' },
            { value: 'employee', label: 'Employee' },
          ]}
          value={form.member_type}
          onChange={set('member_type')}
        />
        <Select
          label="Availability"
          options={[
            { value: 'available', label: 'Available now' },
            { value: 'limited', label: 'Limited availability' },
            { value: 'unavailable', label: 'Fully booked' },
          ]}
          value={form.availability}
          onChange={set('availability')}
        />
      </div>
      <TextInput
        label="Headline"
        placeholder="Builds fast, secure web apps for growing businesses"
        maxLength={200}
        value={form.headline}
        onChange={set('headline')}
        error={errors.headline}
      />
      <TextArea
        label="Bio"
        rows={6}
        hint="Experience, strengths and the kind of work they love. Blank line between paragraphs."
        value={form.bio}
        onChange={set('bio')}
        error={errors.bio}
      />
      <TagInput label="Skills" value={form.skills} onChange={set('skills')} placeholder="React, Node.js, Figma…" error={errors.skills} />
      <div className="grid gap-5 sm:grid-cols-3">
        <TextInput label="Location" placeholder="Nairobi, Kenya" value={form.location} onChange={set('location')} error={errors.location} />
        <TextInput label="Years of experience" type="number" min={0} value={form.years_experience} onChange={set('years_experience')} error={errors.years_experience} />
        <TextInput label={`Hourly rate (${settings.currency})`} type="number" min={0} hint="Empty hides the rate" value={form.hourly_rate} onChange={set('hourly_rate')} error={errors.hourly_rate} />
      </div>
      <TagInput label="Languages" value={form.languages} onChange={set('languages')} placeholder="English, Swahili…" error={errors.languages} />
      <fieldset className="neu-inset p-5">
        <legend className="px-2 text-sm font-bold text-slate">Links clients will check</legend>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <TextInput label="GitHub" type="url" placeholder="https://github.com/username" value={form.github_url} onChange={set('github_url')} error={errors.github_url} />
          <TextInput label="LinkedIn" type="url" placeholder="https://www.linkedin.com/in/username" value={form.linkedin_url} onChange={set('linkedin_url')} error={errors.linkedin_url} />
          <TextInput label="Portfolio" type="url" placeholder="https://" value={form.portfolio_url} onChange={set('portfolio_url')} error={errors.portfolio_url} />
          <TextInput label="Personal website" type="url" placeholder="https://" value={form.website_url} onChange={set('website_url')} error={errors.website_url} />
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput label="Profile link name (slug)" hint="Made from the name if empty" value={form.slug} onChange={set('slug')} error={errors.slug} />
        <TextInput label="Order" type="number" min={0} hint="Lower numbers appear first" value={form.sort_order} onChange={set('sort_order')} error={errors.sort_order} />
      </div>
      <Toggle label="Published" hint="Show this profile on the website" checked={form.published} onChange={set('published')} />
      {state.error && !Object.keys(state.error.fields || {}).length && <p className="field-error">{state.error.message}</p>}
      {Object.keys(errors).length > 0 && <p className="field-error">Please fix the highlighted fields.</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}

export default function Team() {
  const { data, error, loading, reload } = useAsync((opts) => api.admin.team(opts), [])
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  async function remove(member) {
    if (!window.confirm(`Delete ${member.full_name}’s profile? It will disappear from the website and from project credits.`)) return
    try {
      await api.admin.deleteMember(member.id)
      setToast('Profile deleted.')
      reload()
    } catch (err) {
      setToast(err.message)
    }
  }

  const members = data?.members ?? []
  return (
    <div>
      <AdminHeader
        title="Team profiles"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Icon name="plus" size={16} /> Add person
          </button>
        }
      >
        Owners and employees shown on Hire talent and About. Only the CTO can change these.
      </AdminHeader>
      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && members.length === 0 && (
        <EmptyState icon="users" title="No profiles yet">
          Add the owners first, then employees. Profiles stay hidden until you publish them.
        </EmptyState>
      )}
      <ul className="grid gap-5 md:grid-cols-2">
        {members.map((member) => (
          <li key={member.id} className="neu-sm flex items-center gap-4 p-4">
            <Avatar src={member.photo} name={member.full_name} size={64} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate">{member.full_name}</p>
              <p className="truncate text-xs text-muted">
                {member.title} · {member.member_type === 'owner' ? 'Owner' : 'Employee'}
              </p>
              <p className="mt-1 text-xs">
                <span className={`chip ${member.published ? '' : 'opacity-70'}`}>{member.published ? 'Published' : 'Hidden'}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {member.published && (
                <Link to={`/talent/${member.slug}`} target="_blank" className="btn btn-sm h-9 w-9 p-0" aria-label={`View ${member.full_name}’s public profile`}>
                  <Icon name="link" size={16} />
                </Link>
              )}
              <button type="button" className="btn btn-sm h-9 w-9 p-0" aria-label={`Edit ${member.full_name}`} onClick={() => setEditing(member)}>
                <Icon name="edit" size={16} />
              </button>
              <button type="button" className="btn btn-sm btn-danger h-9 w-9 p-0" aria-label={`Delete ${member.full_name}`} onClick={() => remove(member)}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? `Edit ${editing.full_name}` : 'Add a team member'} onClose={() => setEditing(null)} wide>
          <MemberForm
            initial={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              setToast('Profile saved.')
              reload()
            }}
          />
        </Modal>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
