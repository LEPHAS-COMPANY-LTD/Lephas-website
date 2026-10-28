import { useState } from 'react'
import { TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { AdminHeader, Toast } from './shared.jsx'
import { useAdmin } from './context.js'

export default function Account() {
  const { user } = useAdmin()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [state, setState] = useState({ saving: false, error: null })
  const [toast, setToast] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (next !== confirm) {
      setState({ saving: false, error: { message: 'The new passwords do not match.' } })
      return
    }
    setState({ saving: true, error: null })
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setState({ saving: false, error: null })
      setToast('Password changed.')
    } catch (error) {
      setState({ saving: false, error })
    }
  }

  return (
    <div className="max-w-xl">
      <AdminHeader title="My account">
        {user.full_name} · {user.email}
      </AdminHeader>
      <form onSubmit={submit} className="neu space-y-5 p-6 sm:p-8">
        <p className="font-bold text-slate">Change password</p>
        <TextInput label="Current password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <TextInput label="New password" type="password" autoComplete="new-password" required minLength={10} hint="At least 10 characters." value={next} onChange={(e) => setNext(e.target.value)} />
        <TextInput label="Repeat new password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {state.error && <p className="field-error">{state.error.fields?.new_password || state.error.message}</p>}
        <button type="submit" className="btn btn-primary" disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Change password'}
        </button>
      </form>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
