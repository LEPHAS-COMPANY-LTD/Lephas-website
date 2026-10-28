import { one } from '../db.js'
import { clientIp, readJsonBody, unauthorized } from '../http.js'
import {
  clearedSessionCookie,
  createSessionToken,
  currentUser,
  hashPassword,
  publicUser,
  requireUser,
  sessionCookie,
  sha256,
  verifyPassword,
} from '../auth.js'
import { rateLimit } from '../rateLimit.js'
import { Validator } from '../validate.js'

let dummyHash = null
const getDummyHash = async () => (dummyHash ??= await hashPassword('lephas-timing-guard-password'))

async function login({ req, res }) {
  const body = await readJsonBody(req)
  const { email } = new Validator(body)
    .email('email')
    .text('password', { required: true, max: 200, label: 'Password' })
    .done()
  await rateLimit(`login:${sha256(`${clientIp(req)}|${email}`).slice(0, 24)}`, 8, 900)

  const user = await one('select * from users where email = $1', [email])
  const valid = await verifyPassword(body.password, user?.password_hash || (await getDummyHash()))
  if (!user || !valid || !user.active) {
    throw unauthorized('Email or password is incorrect.')
  }
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken(user)))
  return { user: publicUser(user) }
}

async function logout({ res }) {
  res.setHeader('Set-Cookie', clearedSessionCookie())
  return { ok: true }
}

async function me({ req }) {
  const user = await currentUser(req)
  if (!user) throw unauthorized()
  return { user: publicUser(user) }
}

async function changePassword({ req }) {
  const user = await requireUser(req)
  const body = await readJsonBody(req)
  new Validator(body)
    .text('current_password', { required: true, max: 200, label: 'Current password' })
    .text('new_password', { required: true, min: 10, max: 200, label: 'New password' })
    .done()
  const row = await one('select password_hash from users where id = $1', [user.id])
  if (!(await verifyPassword(body.current_password, row.password_hash))) {
    throw unauthorized('Your current password is incorrect.')
  }
  await one('update users set password_hash = $2, updated_at = now() where id = $1 returning id', [
    user.id,
    await hashPassword(body.new_password),
  ])
  return { ok: true }
}

export default [
  { method: 'POST', path: '/api/auth/login', handler: login },
  { method: 'POST', path: '/api/auth/logout', handler: logout },
  { method: 'GET', path: '/api/auth/me', handler: me },
  { method: 'POST', path: '/api/auth/password', handler: changePassword },
]
