import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { MemberCard, ProjectCard, ServiceCard } from '../components/cards.jsx'
import ContactChannels from '../components/ContactChannels.jsx'
import { SectionTitle } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { useSite } from '../context/site.js'

const steps = [
  { icon: 'chat', title: 'Tell us what you need', text: 'Pick a service or a developer and describe your idea in a few minutes. No technical knowledge needed.' },
  { icon: 'users', title: 'Get matched and a plan', text: 'We reply within one business day with questions, a recommended approach and a clear quote.' },
  { icon: 'rocket', title: 'Build with weekly demos', text: 'You see progress every week and can message the team any time through your private request page.' },
  { icon: 'shield', title: 'Launch and support', text: 'We launch, hand over everything you own, and stay on for fixes, updates and new features.' },
]

const reasons = [
  { icon: 'user', title: 'Real profiles you can check', text: 'See each developer’s skills, GitHub, LinkedIn and past work before you hire.' },
  { icon: 'chat', title: 'One conversation, one place', text: 'Every request gets a reference number and a private page where you and our team talk.' },
  { icon: 'briefcase', title: 'Fixed, hourly or monthly', text: 'Choose a fixed-price project, pay by the hour, or keep a developer on a monthly plan.' },
  { icon: 'shield', title: 'You own the result', text: 'Code, designs and accounts are handed over to you. No lock-in.' },
]

export default function Home() {
  usePageMeta(null, 'Lephas Company Ltd builds websites, apps, e-commerce stores, POS systems and APIs. Start a project or hire our developers.')
  const navigate = useNavigate()
  const { counts } = useSite()
  const services = useAsync((opts) => api.services(opts), [])
  const team = useAsync((opts) => api.team({}, opts), [])
  const projects = useAsync((opts) => api.projects({ featured: 'true' }, opts), [])
  const [choice, setChoice] = useState('')

  const serviceList = services.data?.services ?? []
  const members = (team.data?.members ?? []).slice(0, 4)
  const featured = (projects.data?.projects ?? []).slice(0, 3)

  return (
    <div className="space-y-24 sm:space-y-28">
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span className="eyebrow">Lephas Company Ltd · Est. 2026</span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] text-slate sm:text-5xl lg:text-6xl">
            Websites, apps and systems that move your business forward.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Tell us what you want to build, or hire one of our developers directly. We design, build and support
            business websites, online stores, mobile apps, POS systems and APIs.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link to="/start" className="btn btn-primary">
              Start a project
              <Icon name="arrow" size={18} />
            </Link>
            <Link to="/talent" className="btn">
              Hire a developer
            </Link>
          </div>

          <form
            className="neu-inset mt-10 flex max-w-xl flex-col gap-3 p-3 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault()
              navigate(choice ? `/start?service=${choice}` : '/start')
            }}
          >
            <label htmlFor="quick-service" className="sr-only">
              What do you need?
            </label>
            <select
              id="quick-service"
              className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate outline-none"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
            >
              <option value="">What do you need built?</option>
              {serviceList.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-sky btn-sm">
              Get a free quote
            </button>
          </form>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="neu-lg aspect-square p-8" style={{ borderRadius: '999px' }}>
            <div className="neu-inset flex h-full w-full items-center justify-center p-6" style={{ borderRadius: '999px' }}>
              <img src="/logo.svg" alt="Lephas Company Ltd logo: transforming the future" className="h-full w-full" />
            </div>
          </div>
          {counts.team > 0 && (
            <div className="neu-sm absolute -left-2 bottom-8 px-4 py-3 text-sm sm:-left-8">
              <p className="font-bold text-slate">{counts.team} {counts.team === 1 ? 'developer' : 'developers'}</p>
              <p className="text-xs text-muted">ready to hire</p>
            </div>
          )}
          {counts.projects > 0 && (
            <div className="neu-sm absolute -right-2 top-8 px-4 py-3 text-sm sm:-right-6">
              <p className="font-bold text-slate">{counts.projects} {counts.projects === 1 ? 'project' : 'projects'}</p>
              <p className="text-xs text-muted">delivered</p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="services-title">
        <SectionTitle eyebrow="What we build" title={<span id="services-title">Services for every stage of your business</span>}>
          From your first website to the systems that run your shop floor.
        </SectionTitle>
        {serviceList.length > 0 && (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {serviceList.slice(0, 6).map((service) => (
              <ServiceCard key={service.id} service={service} compact />
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <Link to="/services" className="btn">
            See all services
          </Link>
        </div>
      </section>

      <section aria-labelledby="how-title">
        <SectionTitle eyebrow="How it works" title={<span id="how-title">From idea to launch in four steps</span>} />
        <ol className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="neu p-7">
              <div className="flex items-center justify-between">
                <span className="icon-well">
                  <Icon name={step.icon} />
                </span>
                <span className="text-4xl font-bold text-silver">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-5 font-bold text-slate">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {members.length > 0 && (
        <section aria-labelledby="talent-title">
          <SectionTitle eyebrow="Hire talent" title={<span id="talent-title">Meet the people who will build it</span>}>
            Check their skills, GitHub and past work, then hire them for your project.
          </SectionTitle>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/talent" className="btn">
              Browse all talent
            </Link>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="work-title">
          <SectionTitle eyebrow="Our work" title={<span id="work-title">Recent projects</span>} />
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/portfolio" className="btn">
              View the portfolio
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="why-title">
        <SectionTitle eyebrow="Why Lephas" title={<span id="why-title">Built for clients who want clarity</span>} />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => (
            <div key={reason.title} className="neu-inset p-7">
              <Icon name={reason.icon} className="text-sky-deep" size={28} />
              <h3 className="mt-4 font-bold text-slate">{reason.title}</h3>
              <p className="mt-2 text-sm text-muted">{reason.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="neu-lg p-8 text-center sm:p-14">
        <span className="eyebrow">Ready when you are</span>
        <h2 className="mt-3 text-3xl font-bold text-slate sm:text-4xl">Let’s build something that lasts.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Send your idea now and get a reply within one business day. Prefer to talk? Reach us directly.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/start" className="btn btn-primary">
            Start a project
          </Link>
          <Link to="/contact" className="btn">
            Ask a question
          </Link>
        </div>
        <div className="mx-auto mt-10 max-w-3xl text-left">
          <ContactChannels />
        </div>
      </section>
    </div>
  )
}
