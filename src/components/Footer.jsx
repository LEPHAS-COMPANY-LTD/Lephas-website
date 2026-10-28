import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { Logo } from './ui.jsx'
import { useSite } from '../context/site.js'
import { telLink, whatsappLink } from '../lib/format.js'

const year = new Date().getFullYear()

const columns = [
  {
    title: 'For clients',
    links: [
      { to: '/start', label: 'Start a project' },
      { to: '/talent', label: 'Hire a developer' },
      { to: '/services', label: 'Services' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/requests', label: 'Track my request' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/portfolio', label: 'Our work' },
      { to: '/process', label: 'How we work' },
      { to: '/contact', label: 'Contact' },
    ],
  },
]

export default function Footer() {
  const { settings } = useSite()
  const socials = [
    { key: 'linkedin_url', icon: 'linkedin', label: 'LinkedIn' },
    { key: 'github_url', icon: 'github', label: 'GitHub' },
    { key: 'x_url', icon: 'x', label: 'X' },
    { key: 'instagram_url', icon: 'instagram', label: 'Instagram' },
    { key: 'facebook_url', icon: 'facebook', label: 'Facebook' },
  ].filter((social) => settings[social.key])

  return (
    <footer className="mt-24 px-4 pb-10">
      <div className="neu-lg mx-auto max-w-6xl p-8 sm:p-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo size={52} />
            <p className="mt-5 max-w-xs text-sm text-muted">
              Websites, apps and business systems built by a team you can talk to. Transforming the future since 2026.
            </p>
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-3">
                {socials.map((social) => (
                  <li key={social.key}>
                    <a
                      href={settings[social.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm h-10 w-10 p-0"
                      aria-label={social.label}
                    >
                      <Icon name={social.icon} size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-bold uppercase tracking-widest text-slate">{column.title}</p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-muted hover:text-slate">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate">Talk to us</p>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              {settings.contact_email && (
                <li>
                  <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-2 hover:text-slate">
                    <Icon name="mail" size={18} /> {settings.contact_email}
                  </a>
                </li>
              )}
              {settings.contact_phone && (
                <li>
                  <a href={telLink(settings.contact_phone)} className="inline-flex items-center gap-2 hover:text-slate">
                    <Icon name="call" size={18} /> {settings.contact_phone}
                  </a>
                </li>
              )}
              {settings.whatsapp_number && (
                <li>
                  <a
                    href={whatsappLink(settings.whatsapp_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-slate"
                  >
                    <Icon name="whatsapp" size={18} /> WhatsApp
                  </a>
                </li>
              )}
              {settings.office_address && (
                <li className="inline-flex items-start gap-2">
                  <Icon name="map" size={18} className="mt-0.5 shrink-0" /> {settings.office_address}
                </li>
              )}
              {settings.business_hours && (
                <li className="flex items-start gap-2">
                  <Icon name="clock" size={18} className="mt-0.5 shrink-0" /> {settings.business_hours}
                </li>
              )}
              <li>
                <Link to="/contact" className="btn btn-sm mt-2">
                  Send a message
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="divider my-8" />
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
          <p>
            © {year} Lephas Company Ltd. All rights reserved.{' '}
            <span className="chip ml-1 align-middle" title="Website version">
              v{import.meta.env.VITE_APP_VERSION}
            </span>
          </p>
          <Link to="/admin" className="hover:text-slate">
            Team login
          </Link>
        </div>
      </div>
    </footer>
  )
}
