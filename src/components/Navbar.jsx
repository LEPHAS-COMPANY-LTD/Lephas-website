import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/process', label: 'Process' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
]

// TODO (Frontend): final styling, logo, and polish of the mobile menu.
export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold text-brand">
          Lephas
        </Link>

        <button
          type="button"
          className="md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>

        <ul className={`${open ? 'flex' : 'hidden'} absolute left-0 right-0 top-16 flex-col gap-4 bg-white p-4 md:static md:flex md:flex-row md:items-center md:p-0`}>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            </li>
          ))}
          <li>
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="rounded bg-brand px-4 py-2 text-white"
            >
              Request a Quote
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  )
}
