import { useSearchParams } from 'react-router-dom'
import { ProjectCard } from '../components/cards.jsx'
import { EmptyState, ErrorState, Loader, PageHeader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { Link } from 'react-router-dom'

export default function Portfolio() {
  usePageMeta('Portfolio', 'Websites, apps and systems Lephas has designed and built for clients.')
  const [params, setParams] = useSearchParams()
  const service = params.get('service') || ''
  const { data, error, loading, reload } = useAsync((opts) => api.projects({ service }, opts), [service])
  const services = useAsync((opts) => api.services(opts), [])
  const projects = data?.projects ?? []

  return (
    <div>
      <PageHeader eyebrow="Portfolio" title="Work we are proud of">
        A selection of websites, apps and systems built by the Lephas team.
      </PageHeader>
      {(services.data?.services ?? []).length > 0 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by service">
          <button type="button" className={`chip chip-raised ${!service ? 'chip-active' : ''}`} onClick={() => setParams({}, { replace: true })}>
            All
          </button>
          {services.data.services.map((item) => (
            <button
              key={item.slug}
              type="button"
              aria-pressed={service === item.slug}
              className={`chip chip-raised ${service === item.slug ? 'chip-active' : ''}`}
              onClick={() => setParams({ service: item.slug }, { replace: true })}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
      {loading && <Loader label="Loading projects…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && projects.length === 0 && (
        <EmptyState
          icon="layout"
          title={service ? 'No projects in this category yet' : 'Our portfolio is being prepared'}
          action={
            <Link to="/start" className="btn btn-primary">
              Be our next success story
            </Link>
          }
        >
          New case studies are added as projects launch.
        </EmptyState>
      )}
      <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
