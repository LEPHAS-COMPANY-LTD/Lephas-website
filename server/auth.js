import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { one } from './db.js'
import { forbidden, parseCookies, unauthorized } from './http.js'

export const SESSION_COOKIE = 'lephas_session'
const SESSION_SECONDS = 60 * 60 * 12

export const ROLES = ['cto', 'admin', 'staff']

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters.')
  }
  return value
}

const base64url = (input) => Buffer.from(input).toString('base64url')

function signature(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionToken(user) {
  const payload = base64url(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }))
  return `${payload}.${signature(payload)}`
}

function readSessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = signature(payload)
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null
    if (data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`
}

export function clearedSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export async function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE]
  const session = readSessionToken(token)
  if (!session) return null
  const user = await one(
    'select id, full_name, email, role, active from users where id = $1',
    [session.sub],
  )
  if (!user || !user.active) return null
  return user
}

export async function requireUser(req, roles = ROLES) {
  const user = await currentUser(req)
  if (!user) throw unauthorized()
  if (!roles.includes(user.role)) throw forbidden()
  return user
}

export function publicUser(user) {
  return { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

function encryptionKey() {
  return crypto.createHash('sha256').update(`lephas-access-token:${secret()}`).digest()
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.')
}

export function decryptSecret(value) {
  try {
    const [iv, tag, data] = value.split('.').map((part) => Buffer.from(part, 'base64url'))
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
