import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import { api } from '../services/api.js'

export function AdminHeader({ title, children, actions }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate sm:text-3xl">{title}</h1>
        {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}

export function Toast({ message, onClose }) {
  if (!message) return null
  return (
    <div className="neu-sm fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 px-5 py-3 text-sm font-semibold text-slate" role="status">
      <Icon name="check" size={18} className="text-sky-deep" />
      {message}
      <button type="button" aria-label="Dismiss" onClick={onClose} className="text-muted hover:text-slate">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/45 px-4 py-10" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`neu-lg w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} p-6 sm:p-8`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate">{title}</h2>
          <button type="button" className="btn btn-sm h-10 w-10 p-0" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function TagInput({ label, value, onChange, placeholder, error }) {
  const [draft, setDraft] = useState('')
  function add(raw) {
    const items = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    if (items.length === 0) return
    onChange([...new Set([...value, ...items])])
    setDraft('')
  }
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="field flex flex-wrap items-center gap-2" aria-invalid={error ? 'true' : undefined}>
        {value.map((item) => (
          <span key={item} className="chip chip-raised">
            {item}
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((v) => v !== item))}>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent py-1 outline-none"
          value={draft}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => {
            if (event.target.value.includes(',')) add(event.target.value)
            else setDraft(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add(draft)
            } else if (event.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(draft)}
        />
      </div>
      {error ? <p className="field-error">{error}</p> : <p className="mt-1.5 text-xs text-muted">Press Enter or comma to add.</p>}
    </div>
  )
}

async function resizeImage(file, maxSize = 900) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  const type = blob?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const finalBlob = type === 'image/webp' ? blob : await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(finalBlob)
  })
  return { data, type }
}

export function ImageUpload({ label, preview, onUploaded, onClear, round = false, maxSize = 900 }) {
  const [state, setState] = useState({ busy: false, error: null })
  async function pick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setState({ busy: false, error: 'Choose an image file.' })
      return
    }
    setState({ busy: true, error: null })
    try {
      const { data, type } = await resizeImage(file, maxSize)
      const result = await api.admin.uploadImage(data, type)
      onUploaded(result)
      setState({ busy: false, error: null })
    } catch (error) {
      setState({ busy: false, error: error.message || 'Upload failed.' })
    }
  }
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <span
          className={`neu-inset-sm flex shrink-0 items-center justify-center overflow-hidden ${round ? 'h-24 w-24 rounded-full' : 'h-24 w-36'}`}
          style={round ? { borderRadius: '999px' } : undefined}
        >
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="text-muted" />}
        </span>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-sm cursor-pointer">
            {state.busy ? 'Uploading…' : preview ? 'Replace' : 'Upload'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} disabled={state.busy} />
          </label>
          {preview && onClear && (
            <button type="button" className="btn btn-sm" onClick={onClear}>
              Remove
            </button>
          )}
        </div>
      </div>
      {state.error && <p className="field-error">{state.error}</p>}
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span
        className={`mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition peer-focus-visible:ring-2 peer-focus-visible:ring-sky ${checked ? 'bg-slate' : 'neu-inset-sm'}`}
      >
        <span className={`h-5 w-5 rounded-full bg-base shadow transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  )
}
