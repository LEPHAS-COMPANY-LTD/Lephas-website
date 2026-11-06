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

      <section aria-labelledby="explainer-title" className="neu-lg p-4 sm:p-6">
        <h2 id="explainer-title" className="sr-only">Watch: who we are and what we stand for</h2>
        <video className="w-full rounded-2xl" controls preload="metadata" poster="/lephas-explainer-poster.jpg">
          <source src="/lephas-explainer.mp4" type="video/mp4" />
          <track kind="captions" src="/lephas-explainer.vtt" srcLang="en" label="English" default />
          Your browser does not support the video tag.
        </video>
        <details className="mt-5 px-2">
          <summary className="cursor-pointer font-semibold text-slate">Read the transcript</summary>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
            <p>Lephas Company Ltd. Transforming the future.</p>
            <p>Lephas is a software company, founded in 2026, built around its clients. We design, build and support the technology that moves your business forward.</p>
            <p>We build business websites, online stores, mobile apps, point-of-sale systems, and the APIs that connect them. Bring us a whole project, or hire one of our developers directly — the flexibility of hiring an individual, with the accountability of a company.</p>
            <p>What we stand for: plain communication — no jargon, so you always know what we are doing, why, and what it costs. Quality you can rely on — tested code, secure systems, and sites that load fast on any phone. Partnership — we stay with you after launch and grow your product as your business grows. And transforming the future — helping businesses use technology to serve more customers and work smarter.</p>
            <p>From your first idea, to launch day and beyond, you work with a team that keeps you informed every step of the way. Lephas Company Ltd — let’s build what moves your business forward.</p>
          </div>
        </details>
      </section>
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
