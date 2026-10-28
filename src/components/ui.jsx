import { useId } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import { AVAILABILITY, STATUS_TONES, initials } from '../lib/format.js'

export function Logo({ size = 44, withText = true }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="neu-sm inline-flex rounded-full p-1" style={{ borderRadius: '999px' }}>
        <img src="/logo.svg" alt="" width={size} height={size} className="rounded-full" />
      </span>
      {withText && (
        <span className="leading-tight">
          <span className="block text-lg font-bold tracking-wide text-slate">LEPHAS</span>
          <span className="block text-[0.62rem] font-semibold tracking-[0.25em] text-muted">COMPANY LTD</span>
        </span>
      )}
    </span>
  )
}

export function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <header className="mb-12 text-center">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="mt-3 text-3xl font-bold leading-tight text-slate sm:text-4xl md:text-5xl">{title}</h1>
      {children && <div className="mx-auto mt-4 max-w-2xl text-[1rem] text-muted sm:text-lg">{children}</div>}
      {actions && <div className="mt-8 flex flex-wrap justify-center gap-4">{actions}</div>}
    </header>
  )
}

export function SectionTitle({ eyebrow, title, children, align = 'center' }) {
  return (
    <div className={`mb-10 ${align === 'center' ? 'text-center' : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="mt-2 text-2xl font-bold text-slate sm:text-3xl">{title}</h2>
      {children && <p className={`mt-3 text-muted ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{children}</p>}
    </div>
  )
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="neu-sm inline-block h-5 w-5 animate-spin rounded-full border-2 border-sky border-t-transparent" />
      {label}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="neu mx-auto max-w-lg p-8 text-center" role="alert">
      <p className="font-semibold text-slate">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="btn mt-5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = 'spark', title, children, action }) {
  return (
    <div className="neu-inset mx-auto max-w-xl p-10 text-center">
      <span className="icon-well">
        <Icon name={icon} />
      </span>
      <p className="mt-4 text-lg font-semibold text-slate">{title}</p>
      {children && <p className="mt-2 text-sm text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Field({ label, error, hint, children, required, className = '' }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
          {required && <span className="text-sky-deep"> *</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ label, error, hint, required, className, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <input className="field" required={required} {...a11y} {...props} />}
    </Field>
  )
}

export function TextArea({ label, error, hint, required, className, rows = 5, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <textarea className="field resize-y" rows={rows} required={required} {...a11y} {...props} />}
    </Field>
  )
}

export function Select({ label, error, hint, required, className, options, placeholder, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => (
        <select className="field" required={required} {...a11y} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Avatar({ src, name, size = 96, className = '' }) {
  return (
    <span
      className={`neu-sm inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: '999px', padding: Math.max(3, size / 24) }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" loading="lazy" />
      ) : (
        <span
          className="neu-inset-sm flex h-full w-full items-center justify-center font-bold text-sky-deep"
          style={{ borderRadius: '999px', fontSize: size / 3 }}
          aria-label={name}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

export function AvailabilityBadge({ value }) {
  const item = AVAILABILITY[value] ?? AVAILABILITY.available
  return (
    <span className="chip">
      <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} aria-hidden="true" />
      {item.label}
    </span>
  )
}

export function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONES[status] ?? 'bg-silver text-slate'}`}>
      {label ?? status}
    </span>
  )
}

export function ExternalLink({ href, icon, children, className = 'btn btn-sm' }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </a>
  )
}

export function BackLink({ to, children }) {
  return (
    <Link to={to} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-slate">
      <Icon name="back" size={18} />
      {children}
    </Link>
  )
}
