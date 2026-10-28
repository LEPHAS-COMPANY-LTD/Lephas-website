import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { ErrorState, Loader, StatusBadge } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync } from '../lib/useAsync.js'
import { dateTime } from '../lib/format.js'
import { AdminHeader } from './shared.jsx'
import { useAdmin } from './context.js'
import { useSite } from '../context/site.js'

export default function Overview() {
  const { user, isCto } = useAdmin()
  const { settings } = useSite()
  const overview = useAsync((opts) => api.admin.overview(opts), [])
  const latest = useAsync((opts) => api.admin.inquiries({ status: 'open' }, opts), [])

  if (overview.loading) return <Loader />
  if (overview.error) return <ErrorState error={overview.error} onRetry={overview.reload} />
  const c = overview.data.counts
  const tiles = [
    { label: 'New requests', value: c.new_inquiries, to: '/admin/inquiries?status=new', icon: 'inbox' },
    { label: 'Unread client replies', value: c.unread_inquiries, to: '/admin/inquiries', icon: 'chat' },
    { label: 'Open conversations', value: c.open_inquiries, to: '/admin/inquiries?status=open', icon: 'users' },
    { label: 'Projects won', value: c.won_inquiries, to: '/admin/inquiries?status=won', icon: 'star' },
  ]
  const setup = [
    { done: c.services > 0, label: 'Add the services you offer', to: '/admin/services' },
    isCto && { done: c.team > 0, label: 'Add owner and employee profiles', to: '/admin/team' },
    { done: c.projects > 0, label: 'Publish your first portfolio project', to: '/admin/projects' },
    { done: Boolean(settings.contact_email || settings.whatsapp_number), label: 'Fill in email, phone and WhatsApp', to: '/admin/settings' },
  ].filter(Boolean)

  return (
    <div>
      <AdminHeader title={`Hello, ${user.full_name.split(' ')[0]}`}>Here is what is happening with client requests.</AdminHeader>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} to={tile.to} className="neu neu-hover flex items-center gap-4 p-5">
            <span className="icon-well">
              <Icon name={tile.icon} />
            </span>
            <span>
              <span className="block text-2xl font-bold text-slate">{tile.value}</span>
              <span className="block text-xs text-muted">{tile.label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_20rem]">
        <section className="neu p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate">Open requests</h2>
            <Link to="/admin/inquiries" className="text-sm font-semibold text-sky-deep">
              View all
            </Link>
          </div>
          {latest.loading && <Loader />}
          {latest.data && latest.data.inquiries.length === 0 && <p className="text-sm text-muted">No open requests right now.</p>}
          <ul className="space-y-3">
            {(latest.data?.inquiries ?? []).slice(0, 8).map((item) => (
              <li key={item.id}>
                <Link to={`/admin/inquiries/${item.id}`} className="neu-inset-sm flex flex-wrap items-center gap-3 p-4 hover:text-sky-deep">
                  {item.unread && <span className="h-2.5 w-2.5 rounded-full bg-sky" aria-label="Unread" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate">{item.subject}</span>
                    <span className="block text-xs text-muted">
                      {item.reference} · {item.full_name} · {dateTime(item.last_message_at || item.created_at)}
                    </span>
                  </span>
                  <StatusBadge status={item.status} label={item.status_label} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="neu-inset p-6">
          <h2 className="font-bold text-slate">Getting started</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {setup.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className="flex items-start gap-3 hover:text-sky-deep">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-slate text-ice' : 'neu-inset-sm'}`}>
                    {item.done && <Icon name="check" size={12} />}
                  </span>
                  <span className={item.done ? 'text-muted line-through' : 'text-slate'}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
