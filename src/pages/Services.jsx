import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ServiceCard } from '../components/cards.jsx'
import { EmptyState, ErrorState, Loader, PageHeader, Reveal } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'

export default function Services() {
  usePageMeta('Services', 'Business websites, e-commerce, portfolios, web and mobile apps, POS systems, APIs, design and support from Lephas.')
  const { data, error, loading, reload } = useAsync((opts) => api.services(opts), [])
  const [cat, setCat] = useState('all')
  const services = data?.services ?? []
  const groups = services.reduce((acc, service) => {
    ;(acc[service.category] ??= []).push(service)
    return acc
  }, {})
  const categories = Object.keys(groups)
  const visible = cat === 'all' ? Object.entries(groups) : Object.entries(groups).filter(([c]) => c === cat)
  const shownCount = cat === 'all' ? services.length : groups[cat]?.length ?? 0

  return (
    <div>
      <PageHeader
        eyebrow="Services"
        title="What we can build for you"
        actions={
          <Link to="/start" className="btn btn-primary">
            Tell us about your project
          </Link>
        }
      >
        Pick a service to get a quote, or describe something new and we will scope it with you.
      </PageHeader>
      {loading && <Loader />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && services.length === 0 && (
        <EmptyState title="Services are being updated">Please check back soon, or send us your idea directly.</EmptyState>
      )}

      {categories.length > 1 && (
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <button type="button" className={`chip chip-raised ${cat === 'all' ? 'chip-active' : ''}`} onClick={() => setCat('all')}>
            All services
          </button>
          {categories.map((c) => (
            <button key={c} type="button" className={`chip chip-raised ${cat === c ? 'chip-active' : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
          <span className="ml-auto text-sm font-semibold text-muted">
            {shownCount} {shownCount === 1 ? 'service' : 'services'}
          </span>
        </div>
      )}

      <div className="space-y-16">
        {visible.map(([category, items]) => (
          <Reveal as="section" key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`} className="font-display mb-6 scroll-mt-28 text-2xl text-slate">
              {category}
            </h2>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
