import { many, one, query } from '../db.js'
import { badRequest, HttpError, notFound, readJsonBody, reply } from '../http.js'
import { requireUser } from '../auth.js'
import { Validator, isUuid, slugify } from '../validate.js'
import { serializeMember } from '../content.js'

const CTO_ONLY = ['cto']

function memberValues(body) {
  const v = new Validator(body)
    .text('full_name', { required: true, min: 2, max: 120, label: 'Full name' })
    .text('title', { required: true, max: 120, label: 'Job title' })
    .oneOf('member_type', ['owner', 'employee'], { fallback: 'employee', label: 'Type' })
    .text('headline', { max: 200, label: 'Headline' })
    .text('bio', { max: 6000, label: 'Bio', multiline: true })
    .uuid('photo_media_id', { label: 'Photo' })
    .url('photo_url', { label: 'Photo link' })
    .text('location', { max: 120, label: 'Location' })
    .integer('years_experience', { min: 0, max: 70, label: 'Years of experience' })
    .integer('hourly_rate', { min: 0, max: 100000, label: 'Hourly rate' })
    .oneOf('availability', ['available', 'limited', 'unavailable'], { fallback: 'available', label: 'Availability' })
    .list('skills', { maxItems: 40, maxLength: 40, label: 'Skills' })
    .list('languages', { maxItems: 10, maxLength: 40, label: 'Languages' })
    .url('github_url', { label: 'GitHub link' })
    .url('linkedin_url', { label: 'LinkedIn link' })
    .url('portfolio_url', { label: 'Portfolio link' })
    .url('website_url', { label: 'Website link' })
    .integer('sort_order', { min: 0, max: 9999, label: 'Order' })
    .boolean('published', { fallback: false })
  if (v.values.github_url && !/^https:\/\/(www\.)?github\.com\//i.test(v.values.github_url)) {
    v.fail('github_url', 'GitHub link must start with https://github.com/')
  }
  if (v.values.linkedin_url && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(v.values.linkedin_url)) {
    v.fail('linkedin_url', 'LinkedIn link must start with https://www.linkedin.com/')
  }
  if (!body.slug && v.values.full_name) body.slug = slugify(v.values.full_name)
  v.input = body
  v.slug('slug')
  return v.done()
}

const COLUMNS = [
  'slug', 'full_name', 'title', 'member_type', 'headline', 'bio', 'photo_media_id', 'photo_url', 'location',
  'years_experience', 'hourly_rate', 'availability', 'skills', 'languages', 'github_url', 'linkedin_url',
  'portfolio_url', 'website_url', 'sort_order', 'published',
]

function columnValues(m) {
  return COLUMNS.map((column) => {
    if (column === 'headline' || column === 'bio') return m[column] ?? ''
    if (column === 'sort_order') return m[column] ?? 0
    return m[column]
  })
}

function rethrow(error) {
  if (error instanceof HttpError) throw error
  if (error?.code === '23505') throw badRequest('Please fix the highlighted fields.', { slug: 'Another profile already uses this link name.' })
  throw error
}

async function listMembers({ req }) {
  await requireUser(req, CTO_ONLY)
  const rows = await many('select * from team_members order by case member_type when \'owner\' then 0 else 1 end, sort_order, full_name')
  return { members: rows.map((row) => serializeMember(row, { full: true })) }
}

async function createMember({ req }) {
  await requireUser(req, CTO_ONLY)
  const m = memberValues(await readJsonBody(req))
  try {
    const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ')
    const row = await one(`insert into team_members (${COLUMNS.join(', ')}) values (${placeholders}) returning *`, columnValues(m))
    return reply(201, { member: serializeMember(row, { full: true }) })
  } catch (error) {
    rethrow(error)
  }
}

async function updateMember({ req, params }) {
  await requireUser(req, CTO_ONLY)
  if (!isUuid(params.id)) throw notFound('Profile not found.')
  const m = memberValues(await readJsonBody(req))
  try {
    const sets = COLUMNS.map((column, i) => `${column} = $${i + 2}`).join(', ')
    const row = await one(`update team_members set ${sets}, updated_at = now() where id = $1 returning *`, [params.id, ...columnValues(m)])
    if (!row) throw notFound('Profile not found.')
    return { member: serializeMember(row, { full: true }) }
  } catch (error) {
    rethrow(error)
  }
}

async function deleteMember({ req, params }) {
  await requireUser(req, CTO_ONLY)
  if (!isUuid(params.id)) throw notFound('Profile not found.')
  const result = await query('delete from team_members where id = $1', [params.id])
  if (result.rowCount === 0) throw notFound('Profile not found.')
  return { ok: true }
}

export default [
  { method: 'GET', path: '/api/admin/team', handler: listMembers },
  { method: 'POST', path: '/api/admin/team', handler: createMember },
  { method: 'PUT', path: '/api/admin/team/:id', handler: updateMember },
  { method: 'DELETE', path: '/api/admin/team/:id', handler: deleteMember },
]
