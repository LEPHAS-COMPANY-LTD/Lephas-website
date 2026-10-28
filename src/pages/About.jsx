import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { MemberCard } from '../components/cards.jsx'
import { PageHeader, SectionTitle } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'

const values = [
  { icon: 'chat', title: 'Plain communication', text: 'No jargon. You always know what we are doing, why, and what it costs.' },
  { icon: 'shield', title: 'Quality you can rely on', text: 'Tested code, secure systems and sites that load fast on any phone.' },
  { icon: 'users', title: 'Partnership', text: 'We stay with you after launch and grow your product as your business grows.' },
  { icon: 'spark', title: 'Transforming the future', text: 'We help businesses use technology to serve more customers and work smarter.' },
]

export default function About() {
  usePageMeta('About us', 'Lephas Company Ltd is a software company building websites, apps and business systems. Meet the founders and team.')
  const owners = useAsync((opts) => api.team({ type: 'owner' }, opts), [])
  const founders = owners.data?.members ?? []

  return (
    <div className="space-y-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_20rem]">
        <PageHeader eyebrow="About Lephas" title="A software company built around its clients">
          <p>
            Lephas Company Ltd was founded in 2026 to give businesses a reliable partner for their websites, apps and
            systems. We combine the flexibility of hiring individual developers with the accountability of a company.
          </p>
        </PageHeader>
        <div className="neu-lg mx-auto aspect-square w-64 p-6" style={{ borderRadius: '999px' }}>
          <img src="/logo.svg" alt="Lephas Company Ltd logo" className="h-full w-full" />
        </div>
      </div>

      <section>
        <SectionTitle eyebrow="What we believe" title="Our values" />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <div key={value.title} className="neu p-7">
              <span className="icon-well">
                <Icon name={value.icon} />
              </span>
              <h3 className="mt-5 font-bold text-slate">{value.title}</h3>
              <p className="mt-2 text-sm text-muted">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {founders.length > 0 && (
        <section>
          <SectionTitle eyebrow="Leadership" title="Meet the founders" />
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {founders.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </section>
      )}

      <section className="neu-lg p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold text-slate sm:text-3xl">Work with the whole team</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">Browse every developer and designer, or tell us about your project and we will put the right team together.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/talent" className="btn">
            Meet the team
          </Link>
          <Link to="/start" className="btn btn-primary">
            Start a project
          </Link>
        </div>
      </section>
    </div>
  )
}
