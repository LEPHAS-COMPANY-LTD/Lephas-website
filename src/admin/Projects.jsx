import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { EmptyState, ErrorState, Loader, Select, TextArea, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { AdminHeader, ImageUpload, Modal, TagInput, Toast, Toggle } from './shared.jsx'
import { emptyToNull } from './utils.js'
import { useAdmin } from './context.js'

const EMPTY = {
  title: '', slug: '', summary: '', description: '', client_name: '', service_id: '', image_media_id: null, image_url: '',
  tech: [], live_url: '', repo_url: '', featured: false, published: true, completed_on: '', member_ids: [],
}

function ProjectForm({ initial, services, members, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY, ...(initial || {}) }
    for (const key of ['slug', 'description', 'client_name', 'service_id', 'image_url', 'live_url', 'repo_url', 'completed_on']) base[key] = base[key] ?? ''
    return base
  })
  const [preview, setPreview] = useState(initial?.image ?? null)
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ saving: false, error: null })
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event?.target ? event.target.value : event }))

  async function submit(event) {
    event.preventDefault()
    setState({ saving: true, error: null })
    try {
      const payload = Object.fromEntries(Object.keys(EMPTY).map((key) => [key, form[key]]))
      const result = await api.admin.saveProject(initial?.id, emptyToNull(payload))
      onSaved(result.project)
    } catch (error) {
      setErrors(error.fields || {})
      setState({ saving: false, error })
    }
  }

  function toggleMember(memberId) {
    setForm((prev) => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId) ? prev.member_ids.filter((m) => m !== memberId) : [...prev.member_ids, memberId],
    }))
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <TextInput label="Project title" required value={form.title} onChange={set('title')} error={errors.title} />
      <TextInput label="One-line summary" required value={form.summary} onChange={set('summary')} error={errors.summary} maxLength={300} />
      <TextArea label="Full description" rows={5} hint="Problem, solution and results. Leave a blank line between paragraphs." value={form.description} onChange={set('description')} error={errors.description} />
      <ImageUpload
        label="Cover image"
        preview={preview || form.image_url || null}
        onUploaded={(result) => {
          setForm((prev) => ({ ...prev, image_media_id: result.id, image_url: '' }))
          setPreview(result.url)
        }}
        onClear={() => {
          setForm((prev) => ({ ...prev, image_media_id: null, image_url: '' }))
          setPreview(null)
        }}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Service"
          placeholder="None"
          options={services.map((s) => ({ value: s.id, label: s.name }))}
          value={form.service_id}
          onChange={set('service_id')}
          error={errors.service_id}
        />
        <TextInput label="Client name (optional)" value={form.client_name} onChange={set('client_name')} error={errors.client_name} />
        <TextInput label="Live link" type="url" placeholder="https://" value={form.live_url} onChange={set('live_url')} error={errors.live_url} />
        <TextInput label="Code link (GitHub)" type="url" placeholder="https://github.com/…" value={form.repo_url} onChange={set('repo_url')} error={errors.repo_url} />
        <TextInput label="Completed on" type="date" value={form.completed_on} onChange={set('completed_on')} error={errors.completed_on} />
        <TextInput label="Link name (slug)" hint="Made from the title if empty" value={form.slug} onChange={set('slug')} error={errors.slug} />
      </div>
      <TagInput label="Technologies" value={form.tech} onChange={set('tech')} placeholder="React, Node.js…" error={errors.tech} />
      {members.length > 0 && (
        <fieldset>
          <legend className="field-label">Team members who worked on it</legend>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                aria-pressed={form.member_ids.includes(member.id)}
                onClick={() => toggleMember(member.id)}
                className={`chip chip-raised ${form.member_ids.includes(member.id) ? 'chip-active' : ''}`}
              >
                {member.full_name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-8">
        <Toggle label="Published" hint="Visible on the website" checked={form.published} onChange={set('published')} />
        <Toggle label="Featured" hint="Shown on the home page" checked={form.featured} onChange={set('featured')} />
      </div>
      {state.error && !Object.keys(state.error.fields || {}).length && <p className="field-error">{state.error.message}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save project'}
        </button>
      </div>
    </form>
  )
}

export default function Projects() {
  const { canManage } = useAdmin()
  const { data, error, loading, reload } = useAsync((opts) => api.admin.projects(opts), [])
  const services = useAsync((opts) => api.admin.services(opts), [])
  const members = useAsync((opts) => api.admin.memberOptions(opts), [])
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)

  async function remove(project) {
    if (!window.confirm(`Delete “${project.title}” from the portfolio?`)) return
    try {
      await api.admin.deleteProject(project.id)
      setToast('Project deleted.')
      reload()
    } catch (err) {
      setToast(err.message)
    }
  }

  return (
    <div>
      <AdminHeader
        title="Portfolio"
        actions={
          canManage && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
              <Icon name="plus" size={16} /> Add project
            </button>
          )
        }
      >
        Case studies shown on the Portfolio page and on team profiles.
      </AdminHeader>
      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.projects.length === 0 && <EmptyState icon="briefcase" title="No projects yet">Add your first case study.</EmptyState>}
      <ul className="grid gap-5 md:grid-cols-2">
        {(data?.projects ?? []).map((project) => (
          <li key={project.id} className="neu-sm flex gap-4 p-4">
            <span className="neu-inset-sm flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden">
              {project.image ? <img src={project.image} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="text-muted" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate">{project.title}</p>
              <p className="text-xs text-muted">
                {project.service?.name ?? 'No service'} · {project.published ? 'Published' : 'Draft'}
                {project.featured ? ' · Featured' : ''}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{project.summary}</p>
            </div>
            {canManage && (
              <div className="flex shrink-0 flex-col gap-2">
                <button type="button" className="btn btn-sm h-9 w-9 p-0" aria-label={`Edit ${project.title}`} onClick={() => setEditing(project)}>
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" className="btn btn-sm btn-danger h-9 w-9 p-0" aria-label={`Delete ${project.title}`} onClick={() => remove(project)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing.id ? `Edit ${editing.title}` : 'Add a project'} onClose={() => setEditing(null)} wide>
          <ProjectForm
            initial={editing.id ? editing : null}
            services={services.data?.services ?? []}
            members={members.data?.members ?? []}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              setToast('Project saved.')
              reload()
            }}
          />
        </Modal>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
