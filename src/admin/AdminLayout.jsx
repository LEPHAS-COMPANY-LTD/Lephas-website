import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Logo } from '../components/ui.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAdmin } from './context.js'

const ROLE_LABELS = { cto: 'CTO', admin: 'Admin', staff: 'Staff' }

export default function AdminLayout() {
  const { user, logout, isCto } = useAdmin()
  const [open, setOpen] = useState(false)
  const links = [
    { to: '/admin', label: 'Overview', icon: 'layout', end: true },
    { to: '/admin/inquiries', label: 'Requests', icon: 'inbox' },
    { to: '/admin/billing', label: 'Quotes & invoices', icon: 'receipt' },
    { to: '/admin/projects', label: 'Portfolio', icon: 'briefcase' },
    { to: '/admin/services', label: 'Services', icon: 'globe' },
    isCto && { to: '/admin/team', label: 'Team profiles', icon: 'users' },
    isCto && { to: '/admin/users', label: 'Staff accounts', icon: 'shield' },
    { to: '/admin/settings', label: 'Contact settings', icon: 'settings' },
    { to: '/admin/account', label: 'My account', icon: 'user' },
  ].filter(Boolean)

  const nav = (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.to}>
          <NavLink
            to={link.to}
            end={link.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${isActive ? 'neu-inset-sm text-slate' : 'text-muted hover:text-slate'}`
            }
          >
            <Icon name={link.icon} size={19} />
            {link.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-8 px-4 py-6">
      <aside className="neu sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col p-5 lg:flex">
        <div className="flex items-center justify-between gap-2">
          <Link to="/admin">
            <Logo size={40} />
          </Link>
          <ThemeToggle />
        </div>
        <nav className="mt-8 flex-1" aria-label="Admin">
          {nav}
        </nav>
        <div className="neu-inset-sm p-4 text-sm">
          <p className="truncate font-semibold text-slate">{user.full_name}</p>
          <p className="text-xs text-muted">
            {ROLE_LABELS[user.role]} · v{import.meta.env.VITE_APP_VERSION}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/" className="btn btn-sm flex-1">
              Site
            </Link>
            <button type="button" className="btn btn-sm flex-1" onClick={logout}>
              <Icon name="logout" size={16} />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="neu-sm mb-6 flex items-center justify-between p-3 lg:hidden">
          <Logo size={34} />
          <ThemeToggle className="ml-auto mr-3" />
          <button type="button" className="btn btn-sm" aria-expanded={open} aria-label="Admin menu" onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
        {open && (
          <nav className="neu mb-6 p-4 lg:hidden" aria-label="Admin">
            {nav}
            <button type="button" className="btn btn-sm mt-4 w-full" onClick={logout}>
              Log out
            </button>
          </nav>
        )}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
