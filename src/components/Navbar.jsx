import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Logo } from './ui.jsx'
import ThemeToggle from './ThemeToggle.jsx'

const links = [
  { to: '/services', label: 'Services' },
  { to: '/talent', label: 'Hire talent' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/process', label: 'Process' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const location = useLocation()
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === location.pathname
  const setOpen = (update) => setOpenOn((prev) => ((typeof update === 'function' ? update(prev === location.pathname) : update) ? location.pathname : null))

  return (
    <header className="sticky top-0 z-40 bg-base/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4" aria-label="Main">
        <Link to="/" aria-label="Lephas home" className="shrink-0">
          <Logo size={42} />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'neu-inset-sm text-slate' : 'text-muted hover:text-slate'}`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link to="/start" className="btn btn-primary btn-sm">
            Start a project
          </Link>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <ThemeToggle />
        <button
          type="button"
          className="btn btn-sm lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'close' : 'menu'} size={20} />
        </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="px-4 pb-6 lg:hidden">
          <ul className="neu flex flex-col gap-1 p-4">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `block rounded-xl px-4 py-3 font-semibold ${isActive ? 'neu-inset-sm text-slate' : 'text-muted'}`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li className="pt-3">
              <Link to="/start" className="btn btn-primary w-full">
                Start a project
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
