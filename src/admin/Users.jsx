import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { ErrorState, Loader, Select, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { AdminHeader, Modal, Toast } from './shared.jsx'
import { useAdmin } from './context.js'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin: requests, portfolio and services' },
  { value: 'staff', label: 'Staff: requests only' },
]
const ROLE_LABELS = { cto: 'CTO', admin: 'Admin', staff: 'Staff' }

function NewUserForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'staff', password: '' })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState({ saving: false, error: null })
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    setState({ saving: true, error: null })
    try {
      await api.admin.createUser(form)
      onSaved()
    } catch (error) {
      setErrors(error.fields || {})
      setState({ saving: false, error })
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <TextInput label="Full name" required value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
      <TextInput label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} />
      <Select label="Access" options={ROLE_OPTIONS} value={form.role} onChange={set('role')} error={errors.role} />
      <TextInput
        label="Temporary password"
        type="text"
        required
        minLength={10}
        hint="At least 10 characters. Share it privately; they should change it after logging in."
        value={form.password}
        onChange={set('password')}
        error={errors.password}
      />
      {state.error && !Object.keys(state.error.fields || {}).length && <p className="field-error">{state.error.message}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  )
}

export default function Users() {
  const { user: me } = useAdmin()
  const { data, error, loading, reload, setData } = useAsync((opts) => api.admin.users(opts), [])
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  async function change(user, patch, message) {
    try {
      const result = await api.admin.updateUser(user.id, patch)
      setData((prev) => ({ ...prev, users: prev.users.map((u) => (u.id === user.id ? result.user : u)) }))
      setToast(message)
    } catch (err) {
      setToast(err.message)
    }
  }

  async function resetPassword(user) {
    const password = window.prompt(`New temporary password for ${user.full_name} (at least 10 characters):`)
    if (!password) return
    await change(user, { password }, 'Password reset. Share it with them privately.')
  }

  return (
    <div>
      <AdminHeader
        title="Staff accounts"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Add account
          </button>
        }
      >
        Who can log in to this admin area. There is only one CTO account.
      </AdminHeader>
      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <ul className="space-y-3">
        {(data?.users ?? []).map((user) => (
          <li key={user.id} className="neu-sm flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate">
                {user.full_name} {user.id === me.id && <span className="text-xs text-muted">(you)</span>}
              </p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
            {user.role === 'cto' ? (
              <span className="chip">CTO</span>
            ) : (
              <select
                className="field w-auto py-2 text-sm"
                aria-label={`Access for ${user.full_name}`}
                value={user.role}
                onChange={(event) => change(user, { role: event.target.value }, 'Access updated.')}
              >
                <option value="admin">{ROLE_LABELS.admin}</option>
                <option value="staff">{ROLE_LABELS.staff}</option>
              </select>
            )}
            <span className={`chip ${user.active ? '' : 'opacity-70'}`}>{user.active ? 'Active' : 'Deactivated'}</span>
            {user.role !== 'cto' && (
              <div className="flex gap-2">
                <button type="button" className="btn btn-sm" onClick={() => resetPassword(user)}>
                  Reset password
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => change(user, { active: !user.active }, user.active ? 'Account deactivated.' : 'Account reactivated.')}
                >
                  {user.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {adding && (
        <Modal title="Add a staff account" onClose={() => setAdding(false)}>
          <NewUserForm
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false)
              setToast('Account created.')
              reload()
            }}
          />
        </Modal>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
