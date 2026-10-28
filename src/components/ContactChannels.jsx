import Icon from './Icon.jsx'
import { useSite } from '../context/site.js'
import { telLink, whatsappLink } from '../lib/format.js'

export default function ContactChannels({ layout = 'row', message = 'Hello Lephas, I would like to talk about a project.' }) {
  const { settings } = useSite()
  const channels = [
    settings.whatsapp_number && {
      icon: 'whatsapp',
      label: 'WhatsApp',
      value: settings.whatsapp_number,
      href: whatsappLink(settings.whatsapp_number, message),
      external: true,
    },
    settings.contact_email && {
      icon: 'mail',
      label: 'Email',
      value: settings.contact_email,
      href: `mailto:${settings.contact_email}`,
    },
    settings.contact_phone && {
      icon: 'call',
      label: 'Call us',
      value: settings.contact_phone,
      href: telLink(settings.contact_phone),
    },
  ].filter(Boolean)

  if (channels.length === 0) return null

  return (
    <ul className={layout === 'row' ? 'grid gap-5 sm:grid-cols-3' : 'flex flex-col gap-4'}>
      {channels.map((channel) => (
        <li key={channel.label}>
          <a
            href={channel.href}
            {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="neu-sm neu-hover flex items-center gap-4 p-4"
          >
            <span className="icon-well h-12 w-12">
              <Icon name={channel.icon} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate">{channel.label}</span>
              <span className="block truncate text-sm text-muted">{channel.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
