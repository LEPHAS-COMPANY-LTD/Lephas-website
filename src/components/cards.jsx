import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { AvailabilityBadge, Avatar } from './ui.jsx'
import { money, priceLabel } from '../lib/format.js'
import { useSite } from '../context/site.js'

export function ServiceCard({ service, compact = false }) {
  const { settings } = useSite()
  return (
    <article className="neu neu-hover flex h-full flex-col p-7">
      <span className="icon-well">
        <Icon name={service.icon} size={24} />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted">{service.category}</p>
      <h3 className="mt-1 text-lg font-bold text-slate">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{service.summary}</p>
      {!compact && service.features?.length > 0 && (
        <ul className="mt-5 space-y-2">
          {service.features.slice(0, 4).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate">
              <Icon name="check" size={18} className="mt-0.5 shrink-0 text-sky-deep" />
              {feature}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate">{priceLabel(service, settings.currency)}</span>
        <Link to={`/start?service=${service.slug}`} className="btn btn-sm">
          Request this
          <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  )
}

export function MemberCard({ member }) {
  const { settings } = useSite()
  return (
    <article className="neu neu-hover flex h-full flex-col items-center p-7 text-center">
      <Avatar src={member.photo} name={member.full_name} size={104} />
      <h3 className="mt-5 text-lg font-bold text-slate">{member.full_name}</h3>
      <p className="text-sm font-medium text-sky-deep">{member.title}</p>
      {member.headline && <p className="mt-2 line-clamp-2 text-sm text-muted">{member.headline}</p>}
      <div className="mt-4">
        <AvailabilityBadge value={member.availability} />
      </div>
      {member.skills?.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Skills">
          {member.skills.slice(0, 5).map((skill) => (
            <li key={skill} className="chip">
              {skill}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex w-full flex-col gap-3 pt-6">
        {member.hourly_rate !== null && member.hourly_rate !== undefined && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-slate">{money(member.hourly_rate, settings.currency)}</span> / hour
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Link to={`/talent/${member.slug}`} className="btn btn-sm">
            View profile
          </Link>
          <Link to={`/start?hire=${member.slug}`} className="btn btn-primary btn-sm">
            Hire
          </Link>
        </div>
      </div>
    </article>
  )
}

export function ProjectCard({ project }) {
  return (
    <article className="neu neu-hover flex h-full flex-col overflow-hidden p-4">
      <Link to={`/portfolio/${project.slug}`} className="neu-inset block aspect-[16/10] overflow-hidden" aria-label={project.title}>
        {project.image ? (
          <img src={project.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sky-deep">
            <Icon name="layout" size={48} strokeWidth={1.2} />
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
        {project.service && <p className="text-xs font-semibold uppercase tracking-widest text-muted">{project.service.name}</p>}
        <h3 className="mt-1 text-lg font-bold text-slate">
          <Link to={`/portfolio/${project.slug}`} className="hover:text-sky-deep">
            {project.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{project.summary}</p>
        {project.tech?.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Technologies">
            {project.tech.slice(0, 5).map((tech) => (
              <li key={tech} className="chip">
                {tech}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
