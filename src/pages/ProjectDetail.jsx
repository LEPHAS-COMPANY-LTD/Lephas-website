import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { Avatar, BackLink, ErrorState, ExternalLink, Loader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { shortDate } from '../lib/format.js'

export default function ProjectDetail() {
  const { slug } = useParams()
  const { data, error, loading, reload } = useAsync((opts) => api.project(slug, opts), [slug])
  const project = data?.project
  usePageMeta(project?.title ?? 'Project', project?.summary)

  if (loading) return <Loader />
  if (error) {
    return (
      <div>
        <BackLink to="/portfolio">Portfolio</BackLink>
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    )
  }

  return (
    <article>
      <BackLink to="/portfolio">Portfolio</BackLink>
      <header className="mb-10">
        {project.service && <span className="eyebrow">{project.service.name}</span>}
        <h1 className="mt-2 text-3xl font-bold text-slate sm:text-4xl">{project.title}</h1>
        <p className="mt-3 max-w-3xl text-lg text-muted">{project.summary}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ExternalLink href={project.live_url} icon="globe" className="btn btn-primary btn-sm">
            Visit live site
          </ExternalLink>
          <ExternalLink href={project.repo_url} icon="github">
            View code
          </ExternalLink>
        </div>
      </header>
      {project.image && (
        <div className="neu-lg mb-12 p-4">
          <img src={project.image} alt={`${project.title} screenshot`} className="w-full rounded-[1.4rem] object-cover" />
        </div>
      )}
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="neu p-8">
          <h2 className="text-lg font-bold text-slate">About the project</h2>
          <div className="prose-lephas mt-4 text-muted">
            {(project.description || project.summary).split(/\n{2,}/).map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </div>
        <aside className="space-y-6">
          <div className="neu p-6 text-sm">
            {project.client_name && (
              <p className="mb-3">
                <span className="block text-xs text-muted">Client</span>
                <span className="font-semibold text-slate">{project.client_name}</span>
              </p>
            )}
            {project.completed_on && (
              <p className="mb-3">
                <span className="block text-xs text-muted">Completed</span>
                <span className="font-semibold text-slate">{shortDate(project.completed_on)}</span>
              </p>
            )}
            {project.tech?.length > 0 && (
              <>
                <span className="block text-xs text-muted">Built with</span>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <li key={tech} className="chip">
                      {tech}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {data.team.length > 0 && (
            <div className="neu p-6">
              <p className="text-sm font-bold text-slate">Built by</p>
              <ul className="mt-4 space-y-4">
                {data.team.map((member) => (
                  <li key={member.id}>
                    <Link to={`/talent/${member.slug}`} className="flex items-center gap-3 hover:text-sky-deep">
                      <Avatar src={member.photo} name={member.full_name} size={48} />
                      <span>
                        <span className="block text-sm font-semibold text-slate">{member.full_name}</span>
                        <span className="block text-xs text-muted">{member.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link to={`/start${project.service ? `?service=${project.service.slug}` : ''}`} className="btn btn-primary w-full">
            Start a similar project
            <Icon name="arrow" size={18} />
          </Link>
        </aside>
      </div>
    </article>
  )
}
