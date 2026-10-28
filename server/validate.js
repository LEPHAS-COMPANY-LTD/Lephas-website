import { badRequest } from './http.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class Validator {
  constructor(input) {
    this.input = input && typeof input === 'object' ? input : {}
    this.errors = {}
    this.values = {}
  }

  fail(field, message) {
    if (!this.errors[field]) this.errors[field] = message
  }

  text(field, { required = false, min = 0, max = 500, label = field, multiline = false } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.fail(field, `${label} is required.`)
      this.values[field] = null
      return this
    }
    if (typeof raw !== 'string') {
      this.fail(field, `${label} must be text.`)
      return this
    }
    let value = raw.trim()
    if (!multiline) value = value.replace(/\s+/g, ' ')
    if (!value && required) this.fail(field, `${label} is required.`)
    else if (value.length < min) this.fail(field, `${label} must be at least ${min} characters.`)
    else if (value.length > max) this.fail(field, `${label} must be at most ${max} characters.`)
    this.values[field] = value || null
    return this
  }

  email(field, { required = true, label = 'Email' } = {}) {
    this.text(field, { required, max: 254, label })
    const value = this.values[field]
    if (value) {
      if (!EMAIL_RE.test(value)) this.fail(field, 'Enter a valid email address.')
      else this.values[field] = value.toLowerCase()
    }
    return this
  }

  phone(field, { required = false, label = 'Phone' } = {}) {
    this.text(field, { required, max: 32, label })
    const value = this.values[field]
    if (value && !/^\+?[0-9 ()-]{7,20}$/.test(value)) this.fail(field, 'Enter a valid phone number.')
    return this
  }

  url(field, { required = false, label = field } = {}) {
    this.text(field, { required, max: 500, label })
    const value = this.values[field]
    if (value) {
      try {
        const parsed = new URL(value)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol')
      } catch {
        this.fail(field, `${label} must be a full link starting with https://`)
      }
    }
    return this
  }

  oneOf(field, options, { required = false, label = field, fallback = null } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.fail(field, `${label} is required.`)
      this.values[field] = fallback
      return this
    }
    if (!options.includes(raw)) this.fail(field, `${label} is not a valid choice.`)
    this.values[field] = raw
    return this
  }

  integer(field, { required = false, min = 0, max = 100000000, label = field } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.fail(field, `${label} is required.`)
      this.values[field] = null
      return this
    }
    const value = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isInteger(value)) this.fail(field, `${label} must be a whole number.`)
    else if (value < min || value > max) this.fail(field, `${label} must be between ${min} and ${max}.`)
    this.values[field] = Number.isInteger(value) ? value : null
    return this
  }

  boolean(field, { fallback = false } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null) this.values[field] = fallback
    else if (typeof raw === 'boolean') this.values[field] = raw
    else this.fail(field, `${field} must be true or false.`)
    return this
  }

  list(field, { maxItems = 30, maxLength = 60, label = field } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null || raw === '') {
      this.values[field] = []
      return this
    }
    const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null
    if (!items || items.some((item) => typeof item !== 'string')) {
      this.fail(field, `${label} must be a list of words.`)
      return this
    }
    const cleaned = [...new Set(items.map((item) => item.trim().replace(/\s+/g, ' ')).filter(Boolean))]
    if (cleaned.length > maxItems) this.fail(field, `${label} can have at most ${maxItems} items.`)
    else if (cleaned.some((item) => item.length > maxLength)) this.fail(field, `Each ${label} item must be at most ${maxLength} characters.`)
    this.values[field] = cleaned
    return this
  }

  uuid(field, { required = false, label = field } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null || raw === '') {
      if (required) this.fail(field, `${label} is required.`)
      this.values[field] = null
      return this
    }
    if (typeof raw !== 'string' || !UUID_RE.test(raw)) this.fail(field, `${label} is not valid.`)
    this.values[field] = raw
    return this
  }

  uuidList(field) {
    const raw = this.input[field]
    if (raw === undefined || raw === null) {
      this.values[field] = []
      return this
    }
    if (!Array.isArray(raw) || raw.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) {
      this.fail(field, `${field} must be a list of ids.`)
      return this
    }
    this.values[field] = [...new Set(raw)]
    return this
  }

  slug(field, { required = true, label = 'Slug' } = {}) {
    this.text(field, { required, max: 80, label })
    const value = this.values[field]
    if (value && !SLUG_RE.test(value)) this.fail(field, `${label} may only use lowercase letters, numbers and dashes.`)
    return this
  }

  date(field, { label = field } = {}) {
    const raw = this.input[field]
    if (raw === undefined || raw === null || raw === '') {
      this.values[field] = null
      return this
    }
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
      this.fail(field, `${label} must be a date.`)
    }
    this.values[field] = raw
    return this
  }

  done() {
    if (Object.keys(this.errors).length > 0) {
      throw badRequest('Please fix the highlighted fields.', this.errors)
    }
    return this.values
  }
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
