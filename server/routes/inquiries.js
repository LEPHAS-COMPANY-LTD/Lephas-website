import { many, one, transaction } from '../db.js'
import { clientIp, notFound, readJsonBody, reply, siteUrl, unauthorized } from '../http.js'
import { decryptSecret, encryptSecret, randomToken, safeEqualHex, sha256 } from '../auth.js'
import { rateLimit } from '../rateLimit.js'
import { Validator } from '../validate.js'
import { emailLayout, sendEmail } from '../email.js'
import { documentsForInquiry } from '../billing.js'

export const INQUIRY_KINDS = ['project', 'hire', 'contact']
export const INQUIRY_STATUSES = ['new', 'in_review', 'awaiting_client', 'proposal_sent', 'won', 'lost', 'closed']
export const STATUS_LABELS = {
  new: 'Received',
  in_review: 'In review',
  awaiting_client: 'Waiting for your reply',
  proposal_sent: 'Proposal sent',
  won: 'Project started',
  lost: 'Closed',
  closed: 'Closed',
}
export const BUDGET_RANGES = ['under_500', '500_2000', '2000_5000', '5000_15000', 'over_15000', 'not_sure']
export const TIMELINES = ['asap', '1_month', '1_3_months', '3_6_months', 'flexible']
export const ENGAGEMENTS = ['fixed', 'hourly', 'monthly', 'not_sure']

export function trackingUrl(req, reference, token) {
  return `${siteUrl(req)}/requests/${encodeURIComponent(reference)}?token=${encodeURIComponent(token)}`
}

function ipBucket(req) {
  return sha256(clientIp(req)).slice(0, 24)
}

export async function loadForClient(reference, token) {
  if (typeof token !== 'string' || token.length < 20) throw unauthorized('This link is missing its access code.')
  const inquiry = await one(
    `select i.*, s.name as service_name, m.full_name as member_name, m.slug as member_slug
     from inquiries i
     left join services s on s.id = i.service_id
     left join team_members m on m.id = i.team_member_id
     where i.reference = $1`,
    [reference],
  )
  if (!inquiry || !safeEqualHex(inquiry.access_token_hash, sha256(token))) {
    throw notFound('We could not find a request with this link. Check that you copied the whole link.')
  }
  return inquiry
}

function clientView(inquiry, messages, documents = []) {
  return {
    reference: inquiry.reference,
    kind: inquiry.kind,
    status: inquiry.status,
    status_label: STATUS_LABELS[inquiry.status],
    full_name: inquiry.full_name,
    email: inquiry.email,
    subject: inquiry.subject,
    service: inquiry.service_name,
    member: inquiry.member_name ? { name: inquiry.member_name, slug: inquiry.member_slug } : null,
    budget_range: inquiry.budget_range,
    timeline: inquiry.timeline,
    engagement: inquiry.engagement,
    details: inquiry.details,
    created_at: inquiry.created_at,
    documents,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      author: m.sender === 'team' ? m.author_name || 'Lephas team' : m.sender === 'client' ? inquiry.full_name : 'Lephas',
      body: m.body,
      created_at: m.created_at,
    })),
  }
}

async function threadMessages(inquiryId) {
  return many(
    `select m.*, u.full_name as author_name from messages m
     left join users u on u.id = m.author_user_id
     where m.inquiry_id = $1 order by m.created_at, m.id`,
    [inquiryId],
  )
}

async function createInquiry({ req }) {
  const body = await readJsonBody(req)
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return reply(201, { reference: 'LPH-RECEIVED', tracking_url: null })
  }
  await rateLimit(`inquiry:${ipBucket(req)}`, 6, 3600)

  const v = new Validator(body)
    .oneOf('kind', INQUIRY_KINDS, { required: true, label: 'Request type' })
    .text('full_name', { required: true, min: 2, max: 120, label: 'Your name' })
    .email('email')
    .phone('phone')
    .text('company', { max: 120, label: 'Company' })
    .text('country', { max: 80, label: 'Country' })
    .oneOf('preferred_contact', ['email', 'phone', 'whatsapp'], { fallback: 'email', label: 'Preferred contact' })
    .uuid('service_id', { label: 'Service' })
    .text('team_member_slug', { max: 80, label: 'Team member' })
    .oneOf('engagement', ENGAGEMENTS, { label: 'Engagement' })
    .oneOf('budget_range', BUDGET_RANGES, { label: 'Budget' })
    .oneOf('timeline', TIMELINES, { label: 'Timeline' })
    .text('subject', { max: 160, label: 'Subject' })
    .text('details', { required: true, min: 20, max: 5000, label: 'Project details', multiline: true })

  const kind = v.values.kind
  if (kind === 'project' && !v.values.service_id) v.fail('service_id', 'Choose the service you need.')
  if (kind === 'hire' && !v.values.team_member_slug) v.fail('team_member_slug', 'Choose who you would like to hire.')
  if ((v.values.preferred_contact === 'phone' || v.values.preferred_contact === 'whatsapp') && !v.values.phone) {
    v.fail('phone', 'Add a phone number so we can reach you that way.')
  }

  let service = null
  if (v.values.service_id) {
    service = await one('select id, name from services where id = $1 and active', [v.values.service_id])
    if (!service) v.fail('service_id', 'This service is not available.')
  }
  let member = null
  if (v.values.team_member_slug) {
    member = await one('select id, full_name from team_members where slug = $1 and published', [v.values.team_member_slug])
    if (!member) v.fail('team_member_slug', 'This team member is not available.')
  }
  const values = v.done()

  const token = randomToken()
  const subject =
    values.subject ||
    (kind === 'hire' ? `Hire ${member.full_name}` : kind === 'project' ? `New ${service.name} project` : 'General enquiry')

  const inquiry = await transaction(async (tx) => {
    const seq = await tx.one("select nextval('inquiry_number_seq') as n")
    const reference = `LPH-${new Date().getFullYear()}-${String(seq.n).padStart(4, '0')}`
    const row = await tx.one(
      `insert into inquiries (reference, kind, full_name, email, phone, company, country, preferred_contact,
         service_id, team_member_id, engagement, budget_range, timeline, subject, details, access_token_hash, access_token_enc, client_last_seen_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
       returning *`,
      [
        reference, kind, values.full_name, values.email, values.phone, values.company, values.country,
        values.preferred_contact, service?.id ?? null, member?.id ?? null, values.engagement,
        values.budget_range, values.timeline, subject, values.details, sha256(token), encryptSecret(token),
      ],
    )
    await tx.query(
      `insert into messages (inquiry_id, sender, body) values ($1, 'system', $2)`,
      [row.id, `Request ${reference} received. A member of the Lephas team will reply within one business day.`],
    )
    return row
  })

  const link = trackingUrl(req, inquiry.reference, token)
  const adminLink = `${siteUrl(req)}/admin/inquiries/${inquiry.id}`
  await Promise.all([
    sendEmail({
      to: values.email,
      subject: `We received your request (${inquiry.reference})`,
      html: emailLayout(
        `Thanks, ${values.full_name.split(' ')[0]}. We have your request.`,
        [
          `Your reference number is ${inquiry.reference}.`,
          'A member of our team will review it and reply within one business day. You can follow the progress and message us at any time using your private link below.',
          'Keep this link private: anyone with it can read and reply to this conversation.',
        ],
        { label: 'View your request', url: link },
      ),
      text: `Your reference is ${inquiry.reference}. Follow your request here: ${link}`,
    }),
    sendEmail({
      to: process.env.TEAM_NOTIFICATION_EMAIL,
      replyTo: values.email,
      subject: `New ${kind} request ${inquiry.reference}: ${subject}`,
      html: emailLayout(
        `New ${kind} request from ${values.full_name}`,
        [
          `Reference: ${inquiry.reference}`,
          `Email: ${values.email}${values.phone ? `\nPhone: ${values.phone}` : ''}\nPrefers: ${values.preferred_contact}`,
          service ? `Service: ${service.name}` : member ? `Wants to hire: ${member.full_name}` : 'General enquiry',
          values.details,
        ],
        { label: 'Open in admin', url: adminLink },
      ),
      text: `${values.full_name} (${values.email}) sent ${inquiry.reference}. ${adminLink}`,
    }),
  ])

  return reply(201, { reference: inquiry.reference, token, tracking_url: link })
}

async function viewInquiry({ req, params, query }) {
  const token = query.get('token') || req.headers['x-access-token']
  const inquiry = await loadForClient(params.reference, token)
  await one('update inquiries set client_last_seen_at = now() where id = $1 returning id', [inquiry.id])
  return { request: clientView(inquiry, await threadMessages(inquiry.id), await documentsForInquiry(inquiry.id)) }
}

async function clientReply({ req, params }) {
  const body = await readJsonBody(req)
  await rateLimit(`message:${ipBucket(req)}`, 30, 3600)
  const inquiry = await loadForClient(params.reference, body.token)
  const { message } = new Validator(body)
    .text('message', { required: true, min: 1, max: 5000, label: 'Message', multiline: true })
    .done()

  await one(
    `insert into messages (inquiry_id, sender, body) values ($1, 'client', $2) returning id`,
    [inquiry.id, message],
  )
  const nextStatus = ['awaiting_client', 'lost', 'closed'].includes(inquiry.status) ? 'in_review' : inquiry.status
  await one(
    'update inquiries set status = $2, client_last_seen_at = now(), updated_at = now() where id = $1 returning id',
    [inquiry.id, nextStatus],
  )

  const adminLink = `${siteUrl(req)}/admin/inquiries/${inquiry.id}`
  await sendEmail({
    to: process.env.TEAM_NOTIFICATION_EMAIL,
    replyTo: inquiry.email,
    subject: `New reply on ${inquiry.reference} from ${inquiry.full_name}`,
    html: emailLayout(`${inquiry.full_name} replied`, [message], { label: 'Reply in admin', url: adminLink }),
    text: `${inquiry.full_name} replied on ${inquiry.reference}: ${message}\n${adminLink}`,
  })

  const fresh = await loadForClient(params.reference, body.token)
  return reply(201, { request: clientView(fresh, await threadMessages(inquiry.id), await documentsForInquiry(inquiry.id)) })
}

async function lookup({ req }) {
  const body = await readJsonBody(req)
  await rateLimit(`lookup:${ipBucket(req)}`, 5, 3600)
  const { email } = new Validator(body).email('email').done()
  const rows = await many(
    `select reference, status, access_token_enc from inquiries where lower(email) = $1 order by created_at desc limit 10`,
    [email],
  )
  const links = rows
    .map((row) => {
      const token = decryptSecret(row.access_token_enc)
      return token ? `${row.reference} (${STATUS_LABELS[row.status]}): ${trackingUrl(req, row.reference, token)}` : null
    })
    .filter(Boolean)
  if (links.length > 0) {
    await sendEmail({
      to: email,
      subject: 'Your Lephas request links',
      html: emailLayout('Here are your request links', ['You asked for the links to your requests with Lephas.', ...links]),
      text: links.join('\n'),
    })
  }
  return { ok: true, message: 'If we have requests for this email, we have sent the links to it.' }
}

export default [
  { method: 'POST', path: '/api/inquiries', handler: createInquiry },
  { method: 'POST', path: '/api/inquiries/lookup', handler: lookup },
  { method: 'GET', path: '/api/inquiries/:reference', handler: viewInquiry },
  { method: 'POST', path: '/api/inquiries/:reference/messages', handler: clientReply },
]
