import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Logo } from './ui.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services', dropdown: true },
  { to: '/talent', label: 'Hire talent' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/process', label: 'Process' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const linkClass = ({ isActive }) =>
  `nav-link-accent block rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-slate' : 'text-muted hover:text-slate'}`

function BackButton() {
  const navigate = useNavigate()
  const goBack = () => {
    if (window.history.length > 1) window.history.back()
    else navigate('/')
  }
  return (
    <button type="button" onClick={goBack} className="btn btn-sm h-10 w-10 p-0" aria-label="Go back to the previous page" title="Back">
      <Icon name="back" size={20} />
    </button>
  )
}

function ServicesMenu({ services }) {
  return (
    <li className="group relative">
      <NavLink to="/services" className={({ isActive }) => `${linkClass({ isActive })} inline-flex items-center gap-1`} aria-haspopup="true">
        Services
        <Icon name="chevron" size={16} className="transition group-hover:rotate-180 group-focus-within:rotate-180" />
      </NavLink>
      <div className="invisible absolute left-1/2 top-full z-50 w-[22rem] -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="neu p-3">
          <ul className="grid gap-1" aria-label="Our services">
            {services.map((service) => (
              <li key={service.id}>
                <Link to={`/services#${service.slug}`} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-[rgb(200_169_126/0.18)]">
                  <span className="text-sky-deep">
                    <Icon name={service.icon} size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate">{service.name}</span>
                    <span className="block text-xs text-muted">{service.category}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/services" className="btn btn-primary btn-sm mt-2 w-full">
            All services
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </li>
  )
}

export default function Navbar() {
  const location = useLocation()
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === location.pathname
  const setOpen = (update) => setOpenOn((prev) => ((typeof update === 'function' ? update(prev === location.pathname) : update) ? location.pathname : null))
  const { data } = useAsync((opts) => api.services(opts), [])
  const services = data?.services ?? []
  const atHome = location.pathname === '/'

  return (
    <header className="glass-bar sticky top-0 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Main">
        <div className="flex shrink-0 items-center gap-3">
          {!atHome && <BackButton />}
          <Link to="/" aria-label="Lephas home">
            <Logo size={42} />
          </Link>
        </div>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) =>
            link.dropdown && services.length > 0 ? (
              <ServicesMenu key={link.to} services={services} />
            ) : (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={linkClass}>
                  {link.label}
                </NavLink>
              </li>
            ),
          )}
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
            className="btn btn-sm"
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
          <ul className="neu flex max-h-[75vh] flex-col gap-1 overflow-y-auto p-4">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `block rounded-xl px-4 py-3 font-semibold ${isActive ? 'neu-inset-sm text-slate' : 'text-muted'}`}
                >
                  {link.label}
                </NavLink>
                {link.dropdown && services.length > 0 && (
                  <ul className="mb-2 ml-4 border-l border-[rgb(200_169_126/0.6)] pl-3" aria-label="Our services">
                    {services.map((service) => (
                      <li key={service.id}>
                        <Link to={`/services#${service.slug}`} className="block rounded-lg px-3 py-2 text-sm text-muted hover:text-slate">
                          {service.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
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
