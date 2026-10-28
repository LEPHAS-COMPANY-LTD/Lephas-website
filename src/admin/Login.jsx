import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo, TextInput } from '../components/ui.jsx'
import { api } from '../services/api.js'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ sending: false, error: null })

  async function submit(event) {
    event.preventDefault()
    setState({ sending: true, error: null })
    try {
      const data = await api.login(email, password)
      onLogin(data.user)
    } catch (error) {
      setState({ sending: false, error })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <ThemeToggle className="fixed right-5 top-5" />
      <form onSubmit={submit} className="neu-lg w-full max-w-md p-8 sm:p-10">
        <div className="flex justify-center">
          <Logo size={64} />
        </div>
        <h1 className="mt-8 text-center text-2xl font-bold text-slate">Team login</h1>
        <p className="mt-1 text-center text-sm text-muted">For Lephas staff only.</p>
        <div className="mt-8 space-y-5">
          <TextInput label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {state.error && (
          <p className="field-error mt-4" role="alert">
            {state.error.message}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-8 w-full" disabled={state.sending}>
          {state.sending ? 'Logging in…' : 'Log in'}
        </button>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted hover:text-slate">
            Back to the website
          </Link>
        </p>
      </form>
    </div>
  )
}
