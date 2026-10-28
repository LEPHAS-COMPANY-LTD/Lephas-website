import { Link } from 'react-router-dom'
import { ServiceCard } from '../components/cards.jsx'
import { EmptyState, ErrorState, Loader, PageHeader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'

export default function Services() {
  usePageMeta('Services', 'Business websites, e-commerce, portfolios, web and mobile apps, POS systems, APIs, design and support from Lephas.')
  const { data, error, loading, reload } = useAsync((opts) => api.services(opts), [])
  const services = data?.services ?? []
  const groups = services.reduce((acc, service) => {
    ;(acc[service.category] ??= []).push(service)
    return acc
  }, {})

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
      <div className="space-y-16">
        {Object.entries(groups).map(([category, items]) => (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`} className="mb-6 text-xl font-bold text-slate">
              {category}
            </h2>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
