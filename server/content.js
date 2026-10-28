import { many, one } from './db.js'

export const SETTING_KEYS = [
  'contact_email',
  'contact_phone',
  'whatsapp_number',
  'office_address',
  'business_hours',
  'linkedin_url',
  'github_url',
  'x_url',
  'instagram_url',
  'facebook_url',
  'currency',
  'tax_number',
  'payment_instructions',
  'invoice_terms',
  'quote_terms',
  'invoice_due_days',
  'default_tax_rate',
  'default_tax_label',
  'data_protection_registration',
]

export const mediaUrl = (id, fallback) => (id ? `/api/media/${id}` : fallback || null)

export async function getSettings() {
  const rows = await many('select key, value from site_settings')
  const settings = Object.fromEntries(SETTING_KEYS.map((key) => [key, '']))
  settings.currency = 'USD'
  settings.invoice_due_days = '14'
  settings.default_tax_rate = '0'
  settings.default_tax_label = 'VAT'
  settings.invoice_terms = 'Payment is due within 14 days of the invoice date. Please include the invoice number as the payment reference.'
  settings.quote_terms = 'This quotation is valid for 30 days. Work starts after acceptance and the agreed deposit.'
  for (const row of rows) if (SETTING_KEYS.includes(row.key) && row.value) settings[row.key] = row.value
  return settings
}

export function serializeService(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    summary: row.summary,
    description: row.description,
    starting_price: row.starting_price,
    price_unit: row.price_unit,
    delivery_estimate: row.delivery_estimate,
    features: row.features,
    icon: row.icon,
    sort_order: row.sort_order,
    active: row.active,
  }
}

export function serializeMember(row, { full = false } = {}) {
  const base = {
    id: row.id,
    slug: row.slug,
    full_name: row.full_name,
    title: row.title,
    member_type: row.member_type,
    headline: row.headline,
    photo: mediaUrl(row.photo_media_id, row.photo_url),
    location: row.location,
    years_experience: row.years_experience,
    hourly_rate: row.hourly_rate,
    availability: row.availability,
    skills: row.skills,
    github_url: row.github_url,
    linkedin_url: row.linkedin_url,
    portfolio_url: row.portfolio_url,
    website_url: row.website_url,
  }
  if (!full) return base
  return {
    ...base,
    bio: row.bio,
    languages: row.languages,
    photo_media_id: row.photo_media_id,
    photo_url: row.photo_url,
    sort_order: row.sort_order,
    published: row.published,
  }
}

export function serializeProject(row, { full = false } = {}) {
  const base = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    client_name: row.client_name,
    service: row.service_slug ? { slug: row.service_slug, name: row.service_name } : null,
    image: mediaUrl(row.image_media_id, row.image_url),
    tech: row.tech,
    live_url: row.live_url,
    repo_url: row.repo_url,
    featured: row.featured,
    completed_on: row.completed_on ? toDate(row.completed_on) : null,
  }
  if (!full) return base
  return {
    ...base,
    description: row.description,
    service_id: row.service_id,
    image_media_id: row.image_media_id,
    image_url: row.image_url,
    published: row.published,
  }
}

function toDate(value) {
  if (typeof value === 'string') return value.slice(0, 10)
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const PROJECT_SELECT = `
  select p.*, s.slug as service_slug, s.name as service_name
  from projects p left join services s on s.id = p.service_id`

export async function projectMembers(projectId, { publishedOnly = true } = {}) {
  const rows = await many(
    `select m.* from team_members m
     join project_members pm on pm.member_id = m.id
     where pm.project_id = $1 ${publishedOnly ? 'and m.published' : ''}
     order by m.sort_order, m.full_name`,
    [projectId],
  )
  return rows
}

export async function findService(id) {
  return id ? one('select id, name, slug from services where id = $1', [id]) : null
}
