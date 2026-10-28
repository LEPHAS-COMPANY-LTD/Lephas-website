import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { ProjectCard } from '../components/cards.jsx'
import { AvailabilityBadge, Avatar, BackLink, ErrorState, ExternalLink, Loader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { useSite } from '../context/site.js'
import { money } from '../lib/format.js'

export default function TalentProfile() {
  const { slug } = useParams()
  const { settings } = useSite()
  const { data, error, loading, reload } = useAsync((opts) => api.member(slug, opts), [slug])
  const member = data?.member
  usePageMeta(member ? `${member.full_name}, ${member.title}` : 'Talent profile', member?.headline)

  if (loading) return <Loader />
  if (error) {
    return (
      <div>
        <BackLink to="/talent">All talent</BackLink>
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    )
  }

  const facts = [
    member.location && { icon: 'map', label: 'Location', value: member.location },
    member.years_experience !== null && { icon: 'briefcase', label: 'Experience', value: `${member.years_experience} year${member.years_experience === 1 ? '' : 's'}` },
    member.hourly_rate !== null && { icon: 'clock', label: 'Hourly rate', value: `${money(member.hourly_rate, settings.currency)} / hour` },
    member.languages?.length > 0 && { icon: 'chat', label: 'Languages', value: member.languages.join(', ') },
  ].filter(Boolean)

  return (
    <div>
      <BackLink to="/talent">All talent</BackLink>
      <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
        <aside className="neu h-fit p-8 text-center lg:sticky lg:top-28">
          <Avatar src={member.photo} name={member.full_name} size={168} />
          <h1 className="mt-6 text-2xl font-bold text-slate">{member.full_name}</h1>
          <p className="font-medium text-sky-deep">{member.title}</p>
          {member.member_type === 'owner' && <p className="chip mt-3">Co-founder</p>}
          <div className="mt-4">
            <AvailabilityBadge value={member.availability} />
          </div>
          <ul className="mt-6 space-y-3 text-left text-sm">
            {facts.map((fact) => (
              <li key={fact.label} className="flex items-center gap-3">
                <span className="icon-well h-10 w-10">
                  <Icon name={fact.icon} size={18} />
                </span>
                <span>
                  <span className="block text-xs text-muted">{fact.label}</span>
                  <span className="font-semibold text-slate">{fact.value}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3">
            <Link to={`/start?hire=${member.slug}`} className="btn btn-primary w-full">
              Hire {member.full_name.split(' ')[0]}
            </Link>
            <Link to={`/contact?about=${encodeURIComponent(member.full_name)}`} className="btn w-full">
              Ask a question
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ExternalLink href={member.github_url} icon="github">GitHub</ExternalLink>
            <ExternalLink href={member.linkedin_url} icon="linkedin">LinkedIn</ExternalLink>
            <ExternalLink href={member.portfolio_url} icon="briefcase">Portfolio</ExternalLink>
            <ExternalLink href={member.website_url} icon="link">Website</ExternalLink>
          </div>
        </aside>

        <div className="space-y-10">
          {member.headline && <p className="text-xl font-semibold leading-relaxed text-slate">{member.headline}</p>}
          {member.bio && (
            <section className="neu p-8" aria-labelledby="about-title">
              <h2 id="about-title" className="text-lg font-bold text-slate">
                About
              </h2>
              <div className="prose-lephas mt-4 text-muted">
                {member.bio.split(/\n{2,}/).map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}
          {member.skills?.length > 0 && (
            <section className="neu p-8" aria-labelledby="skills-title">
              <h2 id="skills-title" className="text-lg font-bold text-slate">
                Skills
              </h2>
              <ul className="mt-5 flex flex-wrap gap-3">
                {member.skills.map((skill) => (
                  <li key={skill}>
                    <Link to={`/talent?skill=${encodeURIComponent(skill)}`} className="chip chip-raised hover:text-sky-deep">
                      {skill}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="work-title">
            <h2 id="work-title" className="mb-5 text-lg font-bold text-slate">
              Projects with Lephas
            </h2>
            {data.projects.length === 0 ? (
              <p className="neu-inset p-6 text-sm text-muted">Projects will appear here as they are published.</p>
            ) : (
              <div className="grid gap-7 md:grid-cols-2">
                {data.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
