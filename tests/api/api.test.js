import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'

const TEST_DB = process.env.TEST_DATABASE_URL
const skip = !TEST_DB && 'Set TEST_DATABASE_URL to an empty Postgres database to run the API tests.'

let server
let base
let db
let auth

async function api(path, { method = 'GET', body, cookie, client = true, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(client ? { 'X-Lephas-Client': '1' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  return { status: response.status, data, headers: response.headers }
}

async function login(email, password) {
  const res = await api('/api/auth/login', { method: 'POST', body: { email, password } })
  assert.equal(res.status, 200, JSON.stringify(res.data))
  return res.headers.get('set-cookie').split(';')[0]
}


function startFakeSmtp() {
  const mails = []
  const server = net.createServer((socket) => {
    let data = false
    let buffer = ''
    let current = { rcpt: [], body: '' }
    socket.write('220 fake ESMTP\r\n')
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      let index
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        if (data) {
          if (line === '.') {
            data = false
            mails.push(current)
            current = { rcpt: [], body: '' }
            socket.write('250 queued\r\n')
          } else current.body += `${line}\n`
          continue
        }
        const cmd = line.toUpperCase()
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) socket.write('250-fake\r\n250 AUTH PLAIN LOGIN\r\n')
        else if (cmd.startsWith('AUTH')) socket.write('235 ok\r\n')
        else if (cmd.startsWith('MAIL FROM')) {
          current.from = line
          socket.write('250 ok\r\n')
        } else if (cmd.startsWith('RCPT TO')) {
          current.rcpt.push(line)
          socket.write('250 ok\r\n')
        } else if (cmd === 'DATA') {
          data = true
          socket.write('354 go\r\n')
        } else if (cmd === 'QUIT') {
          socket.end('221 bye\r\n')
        } else socket.write('250 ok\r\n')
      }
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, mails, port: server.address().port })))
}

let ip = 0
const freshIp = () => ({ 'X-Forwarded-For': `10.0.${Math.floor(++ip / 250)}.${ip % 250}` })

describe('Lephas API', { skip }, () => {
  let services
  let cto
  let staff

  before(async () => {
    process.env.DATABASE_URL = TEST_DB
    process.env.AUTH_SECRET = 'test-secret-that-is-long-enough-for-hmac-signing'
    process.env.EMAIL_API_KEY = ''
    process.env.ALLOWED_ORIGIN = ''
    db = await import('../../server/db.js')
    auth = await import('../../server/auth.js')
    const { runMigrations } = await import('../../server/migrations.js')
    await db.query('drop schema public cascade; create schema public;')
    await runMigrations(() => {})
    await db.query(`insert into services (slug, name, category, summary, sort_order) values
      ('business-websites', 'Business websites', 'Websites', 'Sites', 1),
      ('mobile-apps', 'Mobile apps', 'Apps', 'Apps', 2)`)
    await db.query(`insert into users (full_name, email, role, password_hash) values
      ('Chief Tech', 'cto@test.dev', 'cto', $1), ('Sam Staff', 'staff@test.dev', 'staff', $1)`, [await auth.hashPassword('Password12345')])
    const { handle } = await import('../../server/router.js')
    server = http.createServer((req, res) => handle(req, res))
    await new Promise((resolve) => server.listen(0, resolve))
    base = `http://127.0.0.1:${server.address().port}`
    services = (await api('/api/services')).data.services
    cto = await login('cto@test.dev', 'Password12345')
    staff = await login('staff@test.dev', 'Password12345')
  })

  after(async () => {
    server?.close()
    await db?.closePool()
  })

  test('health check responds', async () => {
    const res = await api('/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.data.status, 'ok')
  })

  test('unknown endpoint returns 404 JSON', async () => {
    const res = await api('/api/nope')
    assert.equal(res.status, 404)
    assert.ok(res.data.error)
  })

  test('vercel rewrite path is resolved', async () => {
    const res = await api('/api/router?path=services')
    assert.equal(res.status, 200)
    assert.equal(res.data.services.length, 2)
  })

  test('QA-01 a valid project request is saved and returns a private link', async () => {
    const res = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: {
        kind: 'project',
        full_name: 'Ada Client',
        email: 'Ada@Example.com',
        service_id: services[0].id,
        budget_range: '500_2000',
        timeline: '1_month',
        engagement: 'fixed',
        details: 'We need a five page company website with a contact form.',
      },
    })
    assert.equal(res.status, 201, JSON.stringify(res.data))
    assert.match(res.data.reference, /^LPH-\d{4}-\d{4}$/)
    assert.ok(res.data.token.length > 20)
    const view = await api(`/api/inquiries/${res.data.reference}?token=${res.data.token}`)
    assert.equal(view.status, 200)
    assert.equal(view.data.request.email, 'ada@example.com')
    assert.equal(view.data.request.messages[0].sender, 'system')
  })

  test('QA-02 missing required fields are reported per field', async () => {
    const res = await api('/api/inquiries', { method: 'POST', headers: freshIp(), body: { kind: 'project' } })
    assert.equal(res.status, 400)
    assert.ok(res.data.fields.full_name)
    assert.ok(res.data.fields.email)
    assert.ok(res.data.fields.details)
    assert.ok(res.data.fields.service_id)
  })

  test('QA-03 an invalid email is rejected', async () => {
    const res = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'contact', full_name: 'Bob', email: 'not-an-email', details: 'Hello, I would like to know more about you.' },
    })
    assert.equal(res.status, 400)
    assert.ok(res.data.fields.email)
  })

  test('whatsapp contact preference needs a phone number', async () => {
    const res = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'contact', full_name: 'Bob', email: 'bob@example.com', preferred_contact: 'whatsapp', details: 'Please contact me on WhatsApp about a site.' },
    })
    assert.equal(res.status, 400)
    assert.ok(res.data.fields.phone)
  })

  test('honeypot submissions are silently ignored', async () => {
    const before = (await db.one('select count(*)::int as n from inquiries')).n
    const res = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'contact', full_name: 'Bot', email: 'bot@example.com', details: 'spam spam spam spam spam', website: 'http://spam' },
    })
    assert.equal(res.status, 201)
    assert.equal((await db.one('select count(*)::int as n from inquiries')).n, before)
  })

  test('QA-05 many requests from one IP are rate limited', async () => {
    const headers = { 'X-Forwarded-For': '203.0.113.9' }
    let last
    for (let i = 0; i < 7; i += 1) {
      last = await api('/api/inquiries', {
        method: 'POST',
        headers,
        body: { kind: 'contact', full_name: 'Rate Test', email: 'rate@example.com', details: 'Testing the rate limit on this form.' },
      })
    }
    assert.equal(last.status, 429)
  })

  test('requests without the website header are refused', async () => {
    const res = await api('/api/inquiries', { method: 'POST', client: false, body: {} })
    assert.equal(res.status, 403)
  })

  test('a wrong access token does not reveal a request', async () => {
    const created = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'contact', full_name: 'Private Person', email: 'private@example.com', details: 'This should stay private to me only.' },
    })
    const res = await api(`/api/inquiries/${created.data.reference}?token=${'x'.repeat(32)}`)
    assert.equal(res.status, 404)
    assert.equal(res.data.request, undefined)
  })

  test('client and team can message each other on a request', async () => {
    const created = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'contact', full_name: 'Chat Client', email: 'chat@example.com', details: 'I have a question about pricing for an app.' },
    })
    const { reference, token } = created.data
    const sent = await api(`/api/inquiries/${reference}/messages`, {
      method: 'POST',
      headers: freshIp(),
      body: { token, message: 'Any update?' },
    })
    assert.equal(sent.status, 201)

    const list = await api('/api/admin/inquiries?status=open', { cookie: staff })
    const item = list.data.inquiries.find((i) => i.reference === reference)
    assert.ok(item)
    assert.equal(item.unread, true)

    const replied = await api(`/api/admin/inquiries/${item.id}/messages`, {
      method: 'POST',
      cookie: staff,
      body: { message: 'Hi! Pricing starts after a short call.' },
    })
    assert.equal(replied.status, 201, JSON.stringify(replied.data))
    assert.equal(replied.data.inquiry.status, 'awaiting_client')
    assert.ok(replied.data.client_link.includes(token))

    const view = await api(`/api/inquiries/${reference}?token=${token}`)
    const team = view.data.request.messages.find((m) => m.sender === 'team')
    assert.equal(team.author, 'Sam Staff')
    assert.equal(view.data.request.status_label, 'Waiting for your reply')
  })

  test('QA-08 admin endpoints need a session', async () => {
    const res = await api('/api/admin/inquiries')
    assert.equal(res.status, 401)
  })

  test('wrong password is rejected', async () => {
    const res = await api('/api/auth/login', { method: 'POST', body: { email: 'cto@test.dev', password: 'wrong-password' } })
    assert.equal(res.status, 401)
  })

  test('QA-09 status changes persist', async () => {
    const list = await api('/api/admin/inquiries', { cookie: staff })
    const id = list.data.inquiries[0].id
    const res = await api(`/api/admin/inquiries/${id}`, { method: 'PATCH', cookie: staff, body: { status: 'proposal_sent' } })
    assert.equal(res.status, 200)
    const again = await api(`/api/admin/inquiries/${id}`, { cookie: staff })
    assert.equal(again.data.inquiry.status, 'proposal_sent')
  })

  test('only the CTO can manage team profiles', async () => {
    const profile = {
      full_name: 'Jane Developer',
      title: 'Full-stack developer',
      member_type: 'owner',
      skills: ['React', 'Node.js', 'PostgreSQL'],
      hourly_rate: 25,
      github_url: 'https://github.com/jane',
      published: true,
    }
    const denied = await api('/api/admin/team', { method: 'POST', cookie: staff, body: profile })
    assert.equal(denied.status, 403)

    const created = await api('/api/admin/team', { method: 'POST', cookie: cto, body: profile })
    assert.equal(created.status, 201, JSON.stringify(created.data))
    assert.equal(created.data.member.slug, 'jane-developer')

    const badLink = await api('/api/admin/team', { method: 'POST', cookie: cto, body: { ...profile, slug: 'jane-2', github_url: 'https://evil.example.com/jane' } })
    assert.equal(badLink.status, 400)
    assert.ok(badLink.data.fields.github_url)

    const hidden = await api('/api/admin/team', {
      method: 'POST',
      cookie: cto,
      body: { full_name: 'Hidden Person', title: 'Designer', published: false },
    })
    assert.equal(hidden.status, 201)

    const publicList = await api('/api/team')
    assert.deepEqual(publicList.data.members.map((m) => m.slug), ['jane-developer'])
    assert.ok(publicList.data.skills.includes('React'))
    const filtered = await api('/api/team?skill=react')
    assert.equal(filtered.data.members.length, 1)
    const profilePage = await api('/api/team/jane-developer')
    assert.equal(profilePage.data.member.github_url, 'https://github.com/jane')
    const hiddenPage = await api('/api/team/hidden-person')
    assert.equal(hiddenPage.status, 404)
  })

  test('hire requests are linked to a published team member', async () => {
    const res = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'hire', team_member_slug: 'jane-developer', full_name: 'Hiring Manager', email: 'hm@example.com', engagement: 'hourly', details: 'We need help with a React dashboard for three months.' },
    })
    assert.equal(res.status, 201, JSON.stringify(res.data))
    const view = await api(`/api/inquiries/${res.data.reference}?token=${res.data.token}`)
    assert.equal(view.data.request.member.slug, 'jane-developer')
  })

  test('projects show the team members who worked on them', async () => {
    const member = (await api('/api/team/jane-developer')).data.member
    const created = await api('/api/admin/projects', {
      method: 'POST',
      cookie: cto,
      body: { title: 'Shop Online', summary: 'An e-commerce store', service_id: services[0].id, tech: 'React, Node.js', featured: true, member_ids: [member.id] },
    })
    assert.equal(created.status, 201, JSON.stringify(created.data))
    const staffDenied = await api('/api/admin/projects', { method: 'POST', cookie: staff, body: { title: 'X', summary: 'Y' } })
    assert.equal(staffDenied.status, 403)
    const featured = await api('/api/projects?featured=true')
    assert.equal(featured.data.projects[0].slug, 'shop-online')
    assert.deepEqual(featured.data.projects[0].tech, ['React', 'Node.js'])
    const detail = await api('/api/projects/shop-online')
    assert.equal(detail.data.team[0].slug, 'jane-developer')
    const profile = await api('/api/team/jane-developer')
    assert.equal(profile.data.projects[0].slug, 'shop-online')
  })

  test('image uploads are checked and served', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a0a00000000049454e44ae426082', 'hex')
    const fake = await api('/api/admin/media', { method: 'POST', cookie: cto, body: { mime_type: 'image/png', data: Buffer.from('hello').toString('base64') } })
    assert.equal(fake.status, 400)
    const ok = await api('/api/admin/media', { method: 'POST', cookie: cto, body: { mime_type: 'image/png', data: png.toString('base64') } })
    assert.equal(ok.status, 201)
    const image = await fetch(`${base}${ok.data.url}`)
    assert.equal(image.status, 200)
    assert.equal(image.headers.get('content-type'), 'image/png')
  })

  test('contact settings are public but only the CTO can change them', async () => {
    const denied = await api('/api/admin/settings', { method: 'PUT', cookie: staff, body: { contact_email: 'hi@lephas.dev' } })
    assert.equal(denied.status, 403)
    const saved = await api('/api/admin/settings', { method: 'PUT', cookie: cto, body: { contact_email: 'hi@lephas.dev', whatsapp_number: '+254 700 000000' } })
    assert.equal(saved.status, 200, JSON.stringify(saved.data))
    const site = await api('/api/site')
    assert.equal(site.data.settings.contact_email, 'hi@lephas.dev')
    assert.equal(site.data.counts.team, 1)
  })

  test('the CTO manages staff accounts and cannot be demoted', async () => {
    const created = await api('/api/admin/users', { method: 'POST', cookie: cto, body: { full_name: 'New Admin', email: 'admin@test.dev', role: 'admin', password: 'TempPassword1' } })
    assert.equal(created.status, 201)
    const noSecondCto = await api('/api/admin/users', { method: 'POST', cookie: cto, body: { full_name: 'X', email: 'x@test.dev', role: 'cto', password: 'TempPassword1' } })
    assert.equal(noSecondCto.status, 400)
    const users = (await api('/api/admin/users', { cookie: cto })).data.users
    const ctoUser = users.find((u) => u.role === 'cto')
    const demote = await api(`/api/admin/users/${ctoUser.id}`, { method: 'PATCH', cookie: cto, body: { role: 'staff' } })
    assert.equal(demote.status, 403)
    const staffView = await api('/api/admin/users', { cookie: staff })
    assert.equal(staffView.status, 403)
    const deactivate = await api(`/api/admin/users/${created.data.user.id}`, { method: 'PATCH', cookie: cto, body: { active: false } })
    assert.equal(deactivate.data.user.active, false)
    const blocked = await api('/api/auth/login', { method: 'POST', body: { email: 'admin@test.dev', password: 'TempPassword1' } })
    assert.equal(blocked.status, 401)
  })

  test('quotes: draft, send, client accepts, convert to invoice, payments', async () => {
    const created = await api('/api/inquiries', {
      method: 'POST',
      headers: freshIp(),
      body: { kind: 'project', service_id: services[0].id, full_name: 'Quote Client', email: 'quote@example.com', details: 'Please quote a five page website with a blog.' },
    })
    const { reference, token } = created.data
    const inquiry = (await api('/api/admin/inquiries?q=quote@example.com', { cookie: cto })).data.inquiries[0]

    const draftBody = {
      kind: 'quote',
      inquiry_id: inquiry.id,
      title: 'Company website',
      client_name: 'Quote Client',
      client_email: 'quote@example.com',
      currency: 'usd',
      due_date: '2099-01-01',
      tax_rate: 16,
      discount: '50',
      items: [
        { description: 'Design', quantity: 1, unit: 'project', unit_price: '400' },
        { description: 'Development', quantity: 12.5, unit: 'hour', unit_price: 30 },
      ],
    }
    const staffDenied = await api('/api/admin/billing', { method: 'POST', cookie: staff, body: draftBody })
    assert.equal(staffDenied.status, 403)
    const bad = await api('/api/admin/billing', { method: 'POST', cookie: cto, body: { ...draftBody, items: [{ description: '', quantity: 0, unit_price: -1 }] } })
    assert.equal(bad.status, 400)
    assert.ok(bad.data.fields['items.0.description'])

    const draft = await api('/api/admin/billing', { method: 'POST', cookie: cto, body: draftBody })
    assert.equal(draft.status, 201, JSON.stringify(draft.data))
    const doc = draft.data.document
    assert.equal(doc.number, null)
    assert.equal(doc.currency, 'USD')
    assert.equal(doc.subtotal_cents, 77500)
    assert.equal(doc.discount_cents, 5000)
    assert.equal(doc.tax_cents, 11600)
    assert.equal(doc.total_cents, 84100)

    const hiddenDraft = await api(`/api/inquiries/${reference}/documents/${doc.id}?token=${token}`)
    assert.equal(hiddenDraft.status, 404)

    const sent = await api(`/api/admin/billing/${doc.id}/send`, { method: 'POST', cookie: cto })
    assert.equal(sent.status, 200, JSON.stringify(sent.data))
    assert.match(sent.data.document.number, /^QT-\d{4}-\d{4}$/)
    assert.ok(sent.data.client_link.includes(token))

    const locked = await api(`/api/admin/billing/${doc.id}`, { method: 'PUT', cookie: cto, body: draftBody })
    assert.equal(locked.status, 403)

    const view = await api(`/api/inquiries/${reference}?token=${token}`)
    assert.equal(view.data.request.documents.length, 1)
    assert.equal(view.data.request.status, 'proposal_sent')
    const clientDoc = await api(`/api/inquiries/${reference}/documents/${doc.id}?token=${token}`)
    assert.equal(clientDoc.status, 200)
    assert.equal(clientDoc.data.document.total_cents, 84100)
    assert.equal(clientDoc.data.document.inquiry_id, undefined)
    const wrongToken = await api(`/api/inquiries/${reference}/documents/${doc.id}?token=${'y'.repeat(32)}`)
    assert.equal(wrongToken.status, 404)

    const accepted = await api(`/api/inquiries/${reference}/documents/${doc.id}/decision`, {
      method: 'POST',
      headers: freshIp(),
      body: { token, decision: 'accept', note: 'Looks good' },
    })
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data))
    assert.equal(accepted.data.document.status, 'accepted')
    const twice = await api(`/api/inquiries/${reference}/documents/${doc.id}/decision`, { method: 'POST', headers: freshIp(), body: { token, decision: 'decline' } })
    assert.equal(twice.status, 400)

    const invoice = await api(`/api/admin/billing/${doc.id}/convert`, { method: 'POST', cookie: cto })
    assert.equal(invoice.status, 201, JSON.stringify(invoice.data))
    const inv = invoice.data.document
    assert.equal(inv.kind, 'invoice')
    assert.equal(inv.total_cents, 84100)
    assert.equal(inv.items.length, 2)
    assert.equal(inv.source_quote_id, doc.id)

    const early = await api(`/api/admin/billing/${inv.id}/payments`, { method: 'POST', cookie: cto, body: { amount: 10, method: 'cash' } })
    assert.equal(early.status, 400)
    const sentInv = await api(`/api/admin/billing/${inv.id}/send`, { method: 'POST', cookie: cto })
    assert.match(sentInv.data.document.number, /^INV-\d{4}-\d{4}$/)

    const part = await api(`/api/admin/billing/${inv.id}/payments`, { method: 'POST', cookie: cto, body: { amount: '400.00', method: 'mobile_money', reference: 'MPESA123' } })
    assert.equal(part.status, 201, JSON.stringify(part.data))
    assert.equal(part.data.document.status, 'partially_paid')
    assert.equal(part.data.document.balance_cents, 44100)
    const rest = await api(`/api/admin/billing/${inv.id}/payments`, { method: 'POST', cookie: cto, body: { amount: 441, method: 'bank_transfer' } })
    assert.equal(rest.data.document.status, 'paid')
    assert.equal(rest.data.document.balance_cents, 0)
    const removed = await api(`/api/admin/billing/${inv.id}/payments/${rest.data.document.payments[1].id}`, { method: 'DELETE', cookie: cto })
    assert.equal(removed.data.document.status, 'partially_paid')

    const cannotDelete = await api(`/api/admin/billing/${inv.id}`, { method: 'DELETE', cookie: cto })
    assert.equal(cannotDelete.status, 403)
    const voided = await api(`/api/admin/billing/${inv.id}/void`, { method: 'POST', cookie: cto })
    assert.equal(voided.data.document.status, 'void')

    const list = await api('/api/admin/billing?kind=invoice', { cookie: staff })
    assert.equal(list.status, 200)
    assert.equal(list.data.documents.length, 1)
    const thread = await api(`/api/inquiries/${reference}?token=${token}`)
    assert.ok(thread.data.request.messages.some((m) => m.body.includes('accepted quotation')))
  })

  test('hire requests can be invoiced directly and overdue invoices are flagged', async () => {
    const inquiry = (await api('/api/admin/inquiries?kind=hire', { cookie: cto })).data.inquiries[0]
    const created = await api('/api/admin/billing', {
      method: 'POST',
      cookie: cto,
      body: {
        kind: 'invoice',
        inquiry_id: inquiry.id,
        title: 'Development hours',
        client_name: inquiry.full_name,
        client_email: inquiry.email,
        currency: 'KES',
        issue_date: '2020-01-01',
        due_date: '2020-01-15',
        items: [{ description: 'React development', quantity: 10, unit: 'hour', unit_price: 2500 }],
      },
    })
    assert.equal(created.status, 201, JSON.stringify(created.data))
    const sent = await api(`/api/admin/billing/${created.data.document.id}/send`, { method: 'POST', cookie: cto })
    assert.equal(sent.data.document.display_status, 'overdue')
    assert.equal(sent.data.document.total_cents, 2500000)
    const deleteDraft = await api('/api/admin/billing', {
      method: 'POST',
      cookie: cto,
      body: { kind: 'quote', inquiry_id: inquiry.id, title: 'Draft', client_name: 'A', client_email: 'a@b.co', currency: 'USD', items: [{ description: 'X', quantity: 1, unit_price: 1 }] },
    })
    const gone = await api(`/api/admin/billing/${deleteDraft.data.document.id}`, { method: 'DELETE', cookie: cto })
    assert.equal(gone.status, 200)
  })

  test('robots.txt and sitemap list public pages only', async () => {
    const robots = await fetch(`${base}/api/seo/robots`)
    const robotsText = await robots.text()
    assert.equal(robots.status, 200)
    assert.match(robotsText, /Disallow: \/admin/)
    assert.match(robotsText, /Sitemap: http:\/\/127\.0\.0\.1:\d+\/sitemap\.xml/)
    const sitemap = await fetch(`${base}/api/seo/sitemap`)
    const xml = await sitemap.text()
    assert.equal(sitemap.headers.get('content-type'), 'application/xml; charset=utf-8')
    assert.match(xml, /\/talent\/jane-developer/)
    assert.match(xml, /\/portfolio\/shop-online/)
    assert.match(xml, /\/privacy</)
    assert.doesNotMatch(xml, /hidden-person/)
  })

  test('health reports the website version', async () => {
    const res = await api('/api/health')
    assert.match(res.data.version, /^\d+\.\d+\.\d+$/)
  })

  test('with Gmail (SMTP) configured, a quote request emails the client and the team', async () => {
    const smtp = await startFakeSmtp()
    Object.assign(process.env, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_USER: 'lephas.test@gmail.com',
      SMTP_PASS: 'app-password',
      TEAM_NOTIFICATION_EMAIL: 'team@lephas.test',
    })
    try {
      const res = await api('/api/inquiries', {
        method: 'POST',
        headers: freshIp(),
        body: { kind: 'project', service_id: services[1].id, full_name: 'Mail Client', email: 'mail.client@example.com', details: 'Please quote a delivery app for our shop.' },
      })
      assert.equal(res.status, 201, JSON.stringify(res.data))
      assert.equal(smtp.mails.length, 2)
      const toClient = smtp.mails.find((m) => m.rcpt.some((r) => r.includes('mail.client@example.com')))
      const toTeam = smtp.mails.find((m) => m.rcpt.some((r) => r.includes('team@lephas.test')))
      assert.ok(toClient && toTeam)
      assert.match(toClient.from, /lephas\.test@gmail\.com/)
      assert.match(toClient.body, new RegExp(res.data.reference))
      assert.match(toClient.body, /Lephas Company Ltd/)
      assert.match(toTeam.body, /Reply-To: mail\.client@example\.com/i)
    } finally {
      for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'TEAM_NOTIFICATION_EMAIL']) delete process.env[key]
      smtp.server.close()
    }
  })

  test('a broken mail server never blocks the request', async () => {
    Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: '9', SMTP_USER: 'x@gmail.com', SMTP_PASS: 'y' })
    try {
      const res = await api('/api/inquiries', {
        method: 'POST',
        headers: freshIp(),
        body: { kind: 'contact', full_name: 'Still Saved', email: 'saved@example.com', details: 'This must be saved even if email fails.' },
      })
      assert.equal(res.status, 201)
    } finally {
      for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) delete process.env[key]
    }
  })

  test('a sent quotation is emailed with a PDF attached, and the client can download it', async () => {
    const smtp = await startFakeSmtp()
    Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.port), SMTP_USER: 'lephas.test@gmail.com', SMTP_PASS: 'app-password' })
    try {
      const created = await api('/api/inquiries', {
        method: 'POST',
        headers: freshIp(),
        body: { kind: 'project', service_id: services[0].id, full_name: 'Pdf Client', email: 'pdf.client@example.com', details: 'Please send a quotation as a PDF.' },
      })
      const { reference, token } = created.data
      const inquiry = (await api('/api/admin/inquiries?q=pdf.client@example.com', { cookie: cto })).data.inquiries[0]
      const draft = await api('/api/admin/billing', {
        method: 'POST',
        cookie: cto,
        body: {
          kind: 'quote',
          inquiry_id: inquiry.id,
          title: 'Shop website',
          client_name: 'Pdf Client',
          client_email: 'pdf.client@example.com',
          currency: 'KES',
          due_date: '2099-01-01',
          items: [{ description: 'Design and build', quantity: 1, unit: 'project', unit_price: '60000' }],
        },
      })
      const id = draft.data.document.id
      smtp.mails.length = 0

      const draftPdf = await fetch(`${base}/api/inquiries/${reference}/documents/${id}/pdf?token=${token}`)
      assert.equal(draftPdf.status, 404, 'clients cannot download drafts')

      const sent = await api(`/api/admin/billing/${id}/send`, { method: 'POST', cookie: cto })
      assert.equal(sent.status, 200)
      const number = sent.data.document.number
      const mail = smtp.mails.find((m) => m.rcpt.some((r) => r.includes('pdf.client@example.com')))
      assert.ok(mail, 'the client got the email')
      assert.match(mail.body, /Content-Type: application\/pdf/i)
      assert.match(mail.body, new RegExp(`Lephas-Quotation-${number}\\.pdf`))

      const pdf = await fetch(`${base}/api/inquiries/${reference}/documents/${id}/pdf?token=${token}`)
      assert.equal(pdf.status, 200)
      assert.equal(pdf.headers.get('content-type'), 'application/pdf')
      assert.match(pdf.headers.get('content-disposition'), /attachment; filename="Lephas-Quotation-QT-/)
      assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-')

      const wrongToken = await fetch(`${base}/api/inquiries/${reference}/documents/${id}/pdf?token=nope`)
      assert.notEqual(wrongToken.status, 200)

      const noSession = await fetch(`${base}/api/admin/billing/${id}/pdf`)
      assert.equal(noSession.status, 401)
      const staffPdf = await fetch(`${base}/api/admin/billing/${id}/pdf`, { headers: { Cookie: staff } })
      assert.equal(staffPdf.status, 200)
    } finally {
      for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) delete process.env[key]
      smtp.server.close()
    }
  })

  test('if RabbitMQ is unreachable, emails are sent directly instead', async () => {
    const smtp = await startFakeSmtp()
    Object.assign(process.env, {
      RABBITMQ_URL: 'amqp://guest:guest@127.0.0.1:9',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_USER: 'lephas.test@gmail.com',
      SMTP_PASS: 'app-password',
    })
    try {
      const res = await api('/api/inquiries', {
        method: 'POST',
        headers: freshIp(),
        body: { kind: 'contact', full_name: 'Fallback Client', email: 'fallback@example.com', details: 'The queue is down but I still get my email.' },
      })
      assert.equal(res.status, 201)
      assert.ok(smtp.mails.some((m) => m.rcpt.some((r) => r.includes('fallback@example.com'))))
    } finally {
      for (const key of ['RABBITMQ_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) delete process.env[key]
      smtp.server.close()
    }
  })

  test('with RabbitMQ, emails are queued and the worker sends them', { skip: !process.env.TEST_RABBITMQ_URL && 'Set TEST_RABBITMQ_URL to run the queue test.' }, async () => {
    const { spawn } = await import('node:child_process')
    const smtp = await startFakeSmtp()
    const env = {
      RABBITMQ_URL: process.env.TEST_RABBITMQ_URL,
      EMAIL_QUEUE: `lephas.emails.test.${process.pid}`,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_USER: 'lephas.test@gmail.com',
      SMTP_PASS: 'app-password',
      TEAM_NOTIFICATION_EMAIL: 'team@lephas.test',
    }
    Object.assign(process.env, env)
    let worker
    try {
      const res = await api('/api/inquiries', {
        method: 'POST',
        headers: freshIp(),
        body: { kind: 'project', service_id: services[0].id, full_name: 'Queued Client', email: 'queued@example.com', details: 'Please quote a website, sent through the queue.' },
      })
      assert.equal(res.status, 201)
      assert.equal(smtp.mails.length, 0, 'nothing is sent until the worker runs')

      worker = spawn(process.execPath, ['scripts/email-worker.js'], { env: { ...process.env, ...env }, stdio: process.env.DEBUG_WORKER ? 'inherit' : 'ignore' })
      const deadline = Date.now() + 15000
      while (smtp.mails.length < 2 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200))
      assert.equal(smtp.mails.length, 2)
      assert.ok(smtp.mails.some((m) => m.rcpt.some((r) => r.includes('queued@example.com'))))
      assert.ok(smtp.mails.some((m) => m.rcpt.some((r) => r.includes('team@lephas.test'))))
    } finally {
      worker?.kill('SIGTERM')
      for (const key of Object.keys(env)) delete process.env[key]
      smtp.server.close()
    }
  })

  test('logout clears the session cookie', async () => {
    const res = await api('/api/auth/logout', { method: 'POST', cookie: staff })
    assert.match(res.headers.get('set-cookie'), /Max-Age=0/)
  })
})
