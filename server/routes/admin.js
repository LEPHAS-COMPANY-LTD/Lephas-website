import { many, one, query, transaction } from '../db.js'
import { badRequest, forbidden, HttpError, notFound, readJsonBody, reply, siteUrl } from '../http.js'
import { decryptSecret, hashPassword, requireUser } from '../auth.js'
import { Validator, isUuid, slugify } from '../validate.js'
import { emailLayout, sendEmail } from '../email.js'
import {
  PROJECT_SELECT,
  SETTING_KEYS,
  getSettings,
  projectMembers,
  serializeMember,
  serializeProject,
  serializeService,
} from '../content.js'
import { documentsForInquiry } from '../billing.js'
import { BUDGET_RANGES, ENGAGEMENTS, INQUIRY_KINDS, INQUIRY_STATUSES, STATUS_LABELS, TIMELINES, trackingUrl } from './inquiries.js'

const EVERYONE = ['cto', 'admin', 'staff']
const MANAGERS = ['cto', 'admin']
const CTO_ONLY = ['cto']

function requireId(id) {
  if (!isUuid(id)) throw notFound()
  return id
}

function uniqueViolation(error, message) {
  if (error?.code === '23505') throw badRequest(message, { slug: message })
  throw error
}

async function overview({ req }) {
  await requireUser(req, EVERYONE)
  const counts = await one(`select
    (select count(*)::int from inquiries where status = 'new') as new_inquiries,
    (select count(*)::int from inquiries where status in ('in_review', 'awaiting_client', 'proposal_sent')) as open_inquiries,
    (select count(*)::int from inquiries i where exists (
      select 1 from messages m where m.inquiry_id = i.id and m.sender = 'client'
      and m.created_at > coalesce(i.team_last_seen_at, 'epoch'))) as unread_inquiries,
    (select count(*)::int from inquiries where status = 'won') as won_inquiries,
    (select count(*)::int from projects) as projects,
    (select count(*)::int from team_members) as team,
    (select count(*)::int from services where active) as services`)
  return { counts }
}

function serializeInquiry(row) {
  return {
    id: row.id,
    reference: row.reference,
    kind: row.kind,
    status: row.status,
    status_label: STATUS_LABELS[row.status],
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    country: row.country,
    preferred_contact: row.preferred_contact,
    service: row.service_name ? { id: row.service_id, name: row.service_name } : null,
    member: row.member_name ? { id: row.team_member_id, name: row.member_name, slug: row.member_slug } : null,
    engagement: row.engagement,
    budget_range: row.budget_range,
    timeline: row.timeline,
    subject: row.subject,
    details: row.details,
    assigned_to: row.assigned_to ? { id: row.assigned_to, name: row.assignee_name } : null,
    unread: Boolean(row.unread),
    last_message_at: row.last_message_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const INQUIRY_SELECT = `
  select i.*, s.name as service_name, m.full_name as member_name, m.slug as member_slug, u.full_name as assignee_name,
    (select max(created_at) from messages where inquiry_id = i.id) as last_message_at,
    exists (select 1 from messages mm where mm.inquiry_id = i.id and mm.sender = 'client'
      and mm.created_at > coalesce(i.team_last_seen_at, 'epoch')) as unread
  from inquiries i
  left join services s on s.id = i.service_id
  left join team_members m on m.id = i.team_member_id
  left join users u on u.id = i.assigned_to`

async function listInquiries({ req, query: q }) {
  await requireUser(req, EVERYONE)
  const conditions = []
  const params = []
  const status = q.get('status')
  if (status === 'open') conditions.push(`i.status in ('new', 'in_review', 'awaiting_client', 'proposal_sent')`)
  else if (status && INQUIRY_STATUSES.includes(status)) {
    params.push(status)
    conditions.push(`i.status = $${params.length}`)
  }
  const kind = q.get('kind')
  if (kind && INQUIRY_KINDS.includes(kind)) {
    params.push(kind)
    conditions.push(`i.kind = $${params.length}`)
  }
  const search = q.get('q')
  if (search) {
    params.push(`%${search.toLowerCase().slice(0, 80)}%`)
    const n = params.length
    conditions.push(`(lower(i.full_name) like $${n} or lower(i.email) like $${n} or lower(i.reference) like $${n} or lower(coalesce(i.subject, '')) like $${n})`)
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  const rows = await many(`${INQUIRY_SELECT} ${where} order by unread desc, coalesce((select max(created_at) from messages where inquiry_id = i.id), i.created_at) desc limit 200`, params)
  return { inquiries: rows.map(serializeInquiry), statuses: INQUIRY_STATUSES, labels: STATUS_LABELS }
}

async function inquiryThread(id) {
  return many(
    `select m.id, m.sender, m.body, m.created_at, u.full_name as author_name
     from messages m left join users u on u.id = m.author_user_id
     where m.inquiry_id = $1 order by m.created_at, m.id`,
    [id],
  )
}

async function getInquiry({ req, params }) {
  await requireUser(req, EVERYONE)
  const row = await one(`${INQUIRY_SELECT} where i.id = $1`, [requireId(params.id)])
  if (!row) throw notFound('Request not found.')
  const messages = await inquiryThread(row.id)
  await query('update inquiries set team_last_seen_at = now() where id = $1', [row.id])
  const staff = await many(`select id, full_name, role from users where active order by full_name`)
  const token = decryptSecret(row.access_token_enc)
  return {
    inquiry: serializeInquiry(row),
    client_link: token ? trackingUrl(req, row.reference, token) : null,
    documents: await documentsForInquiry(row.id, { includeDrafts: true }),
    messages,
    staff,
    options: { statuses: INQUIRY_STATUSES, labels: STATUS_LABELS, budgets: BUDGET_RANGES, timelines: TIMELINES, engagements: ENGAGEMENTS },
  }
}

async function updateInquiry({ req, params }) {
  const user = await requireUser(req, EVERYONE)
  const id = requireId(params.id)
  const body = await readJsonBody(req)
  const values = new Validator(body)
    .oneOf('status', INQUIRY_STATUSES, { label: 'Status' })
    .uuid('assigned_to', { label: 'Assignee' })
    .done()
  const existing = await one('select * from inquiries where id = $1', [id])
  if (!existing) throw notFound('Request not found.')

  const status = values.status ?? existing.status
  const assignedTo = 'assigned_to' in body ? values.assigned_to : existing.assigned_to
  if (assignedTo && !(await one('select id from users where id = $1 and active', [assignedTo]))) {
    throw badRequest('Please fix the highlighted fields.', { assigned_to: 'This staff member is not active.' })
  }
  await transaction(async (tx) => {
    await tx.query('update inquiries set status = $2, assigned_to = $3, updated_at = now() where id = $1', [id, status, assignedTo])
    if (status !== existing.status) {
      await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'system', $2, $3)`, [
        id,
        user.id,
        `Status changed to "${STATUS_LABELS[status]}".`,
      ])
    }
  })
  return getInquiry({ req, params })
}

async function teamReply({ req, params }) {
  const user = await requireUser(req, EVERYONE)
  const id = requireId(params.id)
  const body = await readJsonBody(req)
  const { message, status } = new Validator(body)
    .text('message', { required: true, max: 5000, label: 'Message', multiline: true })
    .oneOf('status', INQUIRY_STATUSES, { label: 'Status' })
    .done()
  const inquiry = await one('select * from inquiries where id = $1', [id])
  if (!inquiry) throw notFound('Request not found.')

  await transaction(async (tx) => {
    await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'team', $2, $3)`, [id, user.id, message])
    const nextStatus = status || (inquiry.status === 'new' ? 'awaiting_client' : inquiry.status)
    if (nextStatus !== inquiry.status) {
      await tx.query(`insert into messages (inquiry_id, sender, author_user_id, body) values ($1, 'system', $2, $3)`, [
        id,
        user.id,
        `Status changed to "${STATUS_LABELS[nextStatus]}".`,
      ])
    }
    await tx.query(
      `update inquiries set status = $2, team_last_seen_at = now(), updated_at = now(),
         assigned_to = coalesce(assigned_to, $3) where id = $1`,
      [id, nextStatus, user.id],
    )
  })

  const token = decryptSecret(inquiry.access_token_enc)
  const link = token ? trackingUrl(req, inquiry.reference, token) : `${siteUrl(req)}/requests`
  const delivery = await sendEmail({
    to: inquiry.email,
    replyTo: process.env.TEAM_NOTIFICATION_EMAIL || undefined,
    subject: `New message about your request ${inquiry.reference}`,
    html: emailLayout(`${user.full_name} from Lephas replied`, [message], { label: 'Reply to this message', url: link }),
    text: `${user.full_name} from Lephas replied:\n\n${message}\n\nReply here: ${link}`,
  })
  const result = await getInquiry({ req, params })
  return reply(201, { ...result, email_sent: delivery.sent, client_link: token ? link : result.client_link })
}

async function deleteInquiry({ req, params }) {
  await requireUser(req, MANAGERS)
  const result = await query('delete from inquiries where id = $1', [requireId(params.id)])
  if (result.rowCount === 0) throw notFound('Request not found.')
  return { ok: true }
}

function serviceValues(body) {
  const v = new Validator(body)
    .text('name', { required: true, max: 80, label: 'Name' })
    .text('category', { required: true, max: 60, label: 'Category' })
    .text('summary', { required: true, max: 240, label: 'Summary' })
    .text('description', { max: 4000, label: 'Description', multiline: true })
    .integer('starting_price', { min: 0, max: 10000000, label: 'Starting price' })
    .oneOf('price_unit', ['project', 'hour', 'month'], { fallback: 'project', label: 'Price unit' })
    .text('delivery_estimate', { max: 80, label: 'Delivery estimate' })
    .list('features', { maxItems: 12, maxLength: 120, label: 'Features' })
    .text('icon', { max: 30, label: 'Icon' })
    .integer('sort_order', { min: 0, max: 9999, label: 'Order' })
    .boolean('active', { fallback: true })
  if (!body.slug && v.values.name) body.slug = slugify(v.values.name)
  v.input = body
  v.slug('slug')
  return v.done()
}

async function listAdminServices({ req }) {
  await requireUser(req, EVERYONE)
  const rows = await many('select * from services order by sort_order, name')
  return { services: rows.map((row) => serializeService(row)) }
}

async function createService({ req }) {
  await requireUser(req, MANAGERS)
  const s = serviceValues(await readJsonBody(req))
  try {
    const row = await one(
      `insert into services (slug, name, category, summary, description, starting_price, price_unit, delivery_estimate, features, icon, sort_order, active)
       values ($1,$2,$3,$4,coalesce($5,''),$6,$7,$8,$9,coalesce($10,'code'),coalesce($11,0),$12) returning *`,
      [s.slug, s.name, s.category, s.summary, s.description, s.starting_price, s.price_unit, s.delivery_estimate, s.features, s.icon, s.sort_order, s.active],
    )
    return reply(201, { service: serializeService(row) })
  } catch (error) {
    uniqueViolation(error, 'Another service already uses this slug.')
  }
}

async function updateService({ req, params }) {
  await requireUser(req, MANAGERS)
  const s = serviceValues(await readJsonBody(req))
  try {
    const row = await one(
      `update services set slug=$2, name=$3, category=$4, summary=$5, description=coalesce($6,''), starting_price=$7, price_unit=$8,
         delivery_estimate=$9, features=$10, icon=coalesce($11,'code'), sort_order=coalesce($12,0), active=$13, updated_at=now()
       where id=$1 returning *`,
      [requireId(params.id), s.slug, s.name, s.category, s.summary, s.description, s.starting_price, s.price_unit, s.delivery_estimate, s.features, s.icon, s.sort_order, s.active],
    )
    if (!row) throw notFound('Service not found.')
    return { service: serializeService(row) }
  } catch (error) {
    if (error instanceof HttpError) throw error
    uniqueViolation(error, 'Another service already uses this slug.')
  }
}

async function deleteService({ req, params }) {
  await requireUser(req, MANAGERS)
  const result = await query('delete from services where id = $1', [requireId(params.id)])
  if (result.rowCount === 0) throw notFound('Service not found.')
  return { ok: true }
}

function projectValues(body) {
  const v = new Validator(body)
    .text('title', { required: true, max: 120, label: 'Title' })
    .text('summary', { required: true, max: 300, label: 'Summary' })
    .text('description', { max: 8000, label: 'Description', multiline: true })
    .text('client_name', { max: 120, label: 'Client' })
    .uuid('service_id', { label: 'Service' })
    .uuid('image_media_id', { label: 'Image' })
    .url('image_url', { label: 'Image link' })
    .list('tech', { maxItems: 20, maxLength: 40, label: 'Technologies' })
    .url('live_url', { label: 'Live link' })
    .url('repo_url', { label: 'Code link' })
    .boolean('featured', { fallback: false })
    .boolean('published', { fallback: true })
    .date('completed_on', { label: 'Completion date' })
    .uuidList('member_ids')
  if (!body.slug && v.values.title) body.slug = slugify(v.values.title)
  v.input = body
  v.slug('slug')
  return v.done()
}

async function saveProjectMembers(tx, projectId, memberIds) {
  await tx.query('delete from project_members where project_id = $1', [projectId])
  for (const memberId of memberIds) {
    await tx.query(
      'insert into project_members (project_id, member_id) select $1, id from team_members where id = $2 on conflict do nothing',
      [projectId, memberId],
    )
  }
}

async function adminProject(id) {
  const row = await one(`${PROJECT_SELECT} where p.id = $1`, [id])
  if (!row) throw notFound('Project not found.')
  const members = await projectMembers(id, { publishedOnly: false })
  return { project: { ...serializeProject(row, { full: true }), member_ids: members.map((m) => m.id) } }
}

async function listAdminProjects({ req }) {
  await requireUser(req, EVERYONE)
  const rows = await many(`${PROJECT_SELECT} order by p.created_at desc`)
  const links = await many('select project_id, member_id from project_members')
  return {
    projects: rows.map((row) => ({
      ...serializeProject(row, { full: true }),
      member_ids: links.filter((l) => l.project_id === row.id).map((l) => l.member_id),
    })),
  }
}

async function createProject({ req }) {
  await requireUser(req, MANAGERS)
  const p = projectValues(await readJsonBody(req))
  try {
    const id = await transaction(async (tx) => {
      const row = await tx.one(
        `insert into projects (slug, title, summary, description, client_name, service_id, image_media_id, image_url, tech, live_url, repo_url, featured, published, completed_on)
         values ($1,$2,$3,coalesce($4,''),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
        [p.slug, p.title, p.summary, p.description, p.client_name, p.service_id, p.image_media_id, p.image_url, p.tech, p.live_url, p.repo_url, p.featured, p.published, p.completed_on],
      )
      await saveProjectMembers(tx, row.id, p.member_ids)
      return row.id
    })
    return reply(201, await adminProject(id))
  } catch (error) {
    uniqueViolation(error, 'Another project already uses this slug.')
  }
}

async function updateProject({ req, params }) {
  await requireUser(req, MANAGERS)
  const id = requireId(params.id)
  const p = projectValues(await readJsonBody(req))
  try {
    await transaction(async (tx) => {
      const row = await tx.one(
        `update projects set slug=$2, title=$3, summary=$4, description=coalesce($5,''), client_name=$6, service_id=$7, image_media_id=$8,
           image_url=$9, tech=$10, live_url=$11, repo_url=$12, featured=$13, published=$14, completed_on=$15, updated_at=now()
         where id=$1 returning id`,
        [id, p.slug, p.title, p.summary, p.description, p.client_name, p.service_id, p.image_media_id, p.image_url, p.tech, p.live_url, p.repo_url, p.featured, p.published, p.completed_on],
      )
      if (!row) throw notFound('Project not found.')
      await saveProjectMembers(tx, id, p.member_ids)
    })
    return adminProject(id)
  } catch (error) {
    if (error instanceof HttpError) throw error
    uniqueViolation(error, 'Another project already uses this slug.')
  }
}

async function deleteProject({ req, params }) {
  await requireUser(req, MANAGERS)
  const result = await query('delete from projects where id = $1', [requireId(params.id)])
  if (result.rowCount === 0) throw notFound('Project not found.')
  return { ok: true }
}

const MIME_SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
}

async function uploadMedia({ req }) {
  const user = await requireUser(req, MANAGERS)
  const body = await readJsonBody(req)
  const mime = body.mime_type
  if (!MIME_SIGNATURES[mime]) throw badRequest('Only JPEG, PNG or WebP images can be uploaded.')
  if (typeof body.data !== 'string' || body.data.length === 0) throw badRequest('The image is empty.')
  const buffer = Buffer.from(body.data.replace(/^data:[^,]+,/, ''), 'base64')
  if (buffer.length === 0 || buffer.length > 1500000) throw badRequest('Images must be smaller than 1.5 MB.')
  if (!MIME_SIGNATURES[mime](buffer)) throw badRequest('The file does not look like a valid image.')
  const row = await one(
    'insert into media (mime_type, byte_size, data, uploaded_by) values ($1, $2, $3, $4) returning id',
    [mime, buffer.length, buffer, user.id],
  )
  return reply(201, { id: row.id, url: `/api/media/${row.id}` })
}

async function listUsers({ req }) {
  await requireUser(req, CTO_ONLY)
  const users = await many('select id, full_name, email, role, active, created_at from users order by role, full_name')
  return { users }
}

async function createUser({ req }) {
  await requireUser(req, CTO_ONLY)
  const body = await readJsonBody(req)
  const values = new Validator(body)
    .text('full_name', { required: true, max: 120, label: 'Name' })
    .email('email')
    .oneOf('role', ['admin', 'staff'], { required: true, label: 'Role' })
    .text('password', { required: true, min: 10, max: 200, label: 'Temporary password' })
    .done()
  try {
    const row = await one(
      'insert into users (full_name, email, role, password_hash) values ($1, $2, $3, $4) returning id, full_name, email, role, active, created_at',
      [values.full_name, values.email, values.role, await hashPassword(body.password)],
    )
    await sendEmail({
      to: values.email,
      subject: 'Your Lephas admin account',
      html: emailLayout('An account was created for you', [
        `Hi ${values.full_name}, the Lephas CTO created an admin account for you (${values.role}).`,
        'Ask the CTO for your temporary password, then change it after your first login.',
      ], { label: 'Log in', url: `${siteUrl(req)}/admin` }),
      text: `An admin account was created for you at ${siteUrl(req)}/admin`,
    })
    return reply(201, { user: row })
  } catch (error) {
    if (error?.code === '23505') throw badRequest('Please fix the highlighted fields.', { email: 'This email already has an account.' })
    throw error
  }
}

async function updateUser({ req, params }) {
  const actor = await requireUser(req, CTO_ONLY)
  const id = requireId(params.id)
  const body = await readJsonBody(req)
  const values = new Validator(body)
    .oneOf('role', ['admin', 'staff'], { label: 'Role' })
    .text('password', { min: 10, max: 200, label: 'New password' })
    .done()
  if (body.active !== undefined && typeof body.active !== 'boolean') throw badRequest('active must be true or false.')
  const target = await one('select * from users where id = $1', [id])
  if (!target) throw notFound('User not found.')
  if (target.role === 'cto' && (values.role || body.active === false)) {
    throw forbidden('The CTO account cannot be demoted or deactivated here.')
  }
  if (target.id === actor.id && body.active === false) throw forbidden('You cannot deactivate your own account.')
  const row = await one(
    `update users set role = coalesce($2, role), active = coalesce($3, active),
       password_hash = coalesce($4, password_hash), updated_at = now()
     where id = $1 returning id, full_name, email, role, active, created_at`,
    [id, values.role, body.active ?? null, body.password ? await hashPassword(body.password) : null],
  )
  return { user: row }
}

async function readSettings({ req }) {
  await requireUser(req, EVERYONE)
  return { settings: await getSettings() }
}

async function writeSettings({ req }) {
  await requireUser(req, CTO_ONLY)
  const body = await readJsonBody(req)
  const v = new Validator(body)
    .email('contact_email', { required: false, label: 'Contact email' })
    .phone('contact_phone', { label: 'Phone' })
    .phone('whatsapp_number', { label: 'WhatsApp number' })
    .text('office_address', { max: 200, label: 'Office address' })
    .text('business_hours', { max: 120, label: 'Business hours' })
  for (const key of ['linkedin_url', 'github_url', 'x_url', 'instagram_url', 'facebook_url']) v.url(key, { label: 'Link' })
  v.text('currency', { max: 3, label: 'Currency' })
    .text('tax_number', { max: 60, label: 'Tax / registration number' })
    .text('payment_instructions', { max: 1500, label: 'Payment instructions', multiline: true })
    .text('invoice_terms', { max: 1500, label: 'Invoice terms', multiline: true })
    .text('quote_terms', { max: 1500, label: 'Quotation terms', multiline: true })
    .integer('invoice_due_days', { min: 0, max: 365, label: 'Days to pay' })
    .text('default_tax_label', { max: 30, label: 'Tax name' })
  const taxRaw = body.default_tax_rate
  if (taxRaw !== undefined && taxRaw !== null && taxRaw !== '') {
    const rate = Number(taxRaw)
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) v.fail('default_tax_rate', 'Tax rate must be between 0 and 100.')
    else v.values.default_tax_rate = String(rate)
  } else v.values.default_tax_rate = null
  if (v.values.invoice_due_days !== null && v.values.invoice_due_days !== undefined) v.values.invoice_due_days = String(v.values.invoice_due_days)
  if (v.values.currency) {
    v.values.currency = v.values.currency.toUpperCase()
    if (!/^[A-Z]{3}$/.test(v.values.currency)) v.fail('currency', 'Use a 3-letter currency code such as USD or KES.')
  }
  const values = v.done()
  await transaction(async (tx) => {
    for (const key of SETTING_KEYS) {
      if (!(key in body)) continue
      await tx.query(
        `insert into site_settings (key, value, updated_at) values ($1, $2, now())
         on conflict (key) do update set value = excluded.value, updated_at = now()`,
        [key, values[key] ?? ''],
      )
    }
  })
  return { settings: await getSettings() }
}

async function memberOptions({ req }) {
  await requireUser(req, EVERYONE)
  const rows = await many('select * from team_members order by full_name')
  return { members: rows.map((row) => serializeMember(row)) }
}

export default [
  { method: 'GET', path: '/api/admin/overview', handler: overview },
  { method: 'GET', path: '/api/admin/inquiries', handler: listInquiries },
  { method: 'GET', path: '/api/admin/inquiries/:id', handler: getInquiry },
  { method: 'PATCH', path: '/api/admin/inquiries/:id', handler: updateInquiry },
  { method: 'DELETE', path: '/api/admin/inquiries/:id', handler: deleteInquiry },
  { method: 'POST', path: '/api/admin/inquiries/:id/messages', handler: teamReply },
  { method: 'GET', path: '/api/admin/services', handler: listAdminServices },
  { method: 'POST', path: '/api/admin/services', handler: createService },
  { method: 'PUT', path: '/api/admin/services/:id', handler: updateService },
  { method: 'DELETE', path: '/api/admin/services/:id', handler: deleteService },
  { method: 'GET', path: '/api/admin/projects', handler: listAdminProjects },
  { method: 'POST', path: '/api/admin/projects', handler: createProject },
  { method: 'PUT', path: '/api/admin/projects/:id', handler: updateProject },
  { method: 'DELETE', path: '/api/admin/projects/:id', handler: deleteProject },
  { method: 'POST', path: '/api/admin/media', handler: uploadMedia },
  { method: 'GET', path: '/api/admin/members', handler: memberOptions },
  { method: 'GET', path: '/api/admin/users', handler: listUsers },
  { method: 'POST', path: '/api/admin/users', handler: createUser },
  { method: 'PATCH', path: '/api/admin/users/:id', handler: updateUser },
  { method: 'GET', path: '/api/admin/settings', handler: readSettings },
  { method: 'PUT', path: '/api/admin/settings', handler: writeSettings },
]
