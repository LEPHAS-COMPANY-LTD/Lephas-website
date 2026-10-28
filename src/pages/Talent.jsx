import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { MemberCard } from '../components/cards.jsx'
import { EmptyState, ErrorState, Loader, PageHeader } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'

const availabilityOptions = [
  { value: '', label: 'Any availability' },
  { value: 'available', label: 'Available now' },
  { value: 'limited', label: 'Limited availability' },
]

export default function Talent() {
  usePageMeta('Hire talent', 'Browse Lephas developers and designers, check their skills, GitHub and past work, and hire them for your project.')
  const [params, setParams] = useSearchParams()
  const skill = params.get('skill') || ''
  const availability = params.get('availability') || ''
  const q = params.get('q') || ''
  const [search, setSearch] = useState(q)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== q) update('q', search)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const { data, error, loading, reload } = useAsync((opts) => api.team({ skill, availability, q }, opts), [skill, availability, q])
  const all = useAsync((opts) => api.team({}, opts), [])
  const skills = all.data?.skills ?? []
  const members = data?.members ?? []

  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader eyebrow="Hire talent" title="Work directly with our developers">
        Every profile shows real skills, links to GitHub and LinkedIn, and the projects they have delivered. Hire for a
        project, by the hour or monthly.
      </PageHeader>

      <div className="neu mb-10 grid gap-4 p-5 md:grid-cols-[1.6fr_1fr]">
        <label className="neu-inset-sm flex items-center gap-3 px-4">
          <Icon name="search" size={20} className="text-muted" />
          <span className="sr-only">Search talent</span>
          <input
            type="search"
            className="w-full bg-transparent py-3 text-sm outline-none"
            placeholder="Search by name, role or skill"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="sr-only" htmlFor="availability-filter">
          Availability
        </label>
        <select
          id="availability-filter"
          className="field"
          value={availability}
          onChange={(event) => update('availability', event.target.value)}
        >
          {availabilityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 md:col-span-2" role="group" aria-label="Filter by skill">
            <button type="button" className={`chip chip-raised ${!skill ? 'chip-active' : ''}`} onClick={() => update('skill', '')}>
              All skills
            </button>
            {skills.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={skill.toLowerCase() === item.toLowerCase()}
                className={`chip chip-raised ${skill.toLowerCase() === item.toLowerCase() ? 'chip-active' : ''}`}
                onClick={() => update('skill', skill.toLowerCase() === item.toLowerCase() ? '' : item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <Loader label="Loading talent…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && members.length === 0 && (
        <EmptyState icon="users" title={q || skill || availability ? 'No one matches these filters' : 'Profiles are coming soon'}>
          {q || skill || availability
            ? 'Try another skill or clear the filters.'
            : 'Our team profiles are being prepared. You can still send us your project and we will match the right people.'}
        </EmptyState>
      )}
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  )
}
