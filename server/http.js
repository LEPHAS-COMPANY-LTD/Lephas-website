export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details)
export const unauthorized = (message = 'Please log in to continue.') => new HttpError(401, message)
export const forbidden = (message = 'You do not have permission to do this.') => new HttpError(403, message)
export const notFound = (message = 'Not found.') => new HttpError(404, message)

export class Reply {
  constructor(status, body, headers = {}) {
    this.status = status
    this.body = body
    this.headers = headers
  }
}

export const reply = (status, body, headers) => new Reply(status, body, headers)

const MAX_BODY_BYTES = 3 * 1024 * 1024

export function sendJson(res, status, data, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value)
  res.end(JSON.stringify(data))
}

export function sendError(res, error) {
  if (error instanceof HttpError) {
    const payload = { error: error.message }
    if (error.details) payload.fields = error.details
    return sendJson(res, error.status, payload)
  }
  console.error('[api] unexpected error', error)
  return sendJson(res, 500, { error: 'Something went wrong on our side. Please try again.' })
}

export async function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return parseJson(req.body)
    if (Buffer.isBuffer(req.body)) return parseJson(req.body.toString('utf8'))
    return req.body
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'The request is too large.')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return parseJson(Buffer.concat(chunks).toString('utf8'))
}

function parseJson(text) {
  if (!text.trim()) return {}
  try {
    const value = JSON.parse(text)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object')
    return value
  } catch {
    throw badRequest('The request body must be a JSON object.')
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie || ''
  const cookies = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const key = part.slice(0, index).trim()
    if (!key) continue
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim())
    } catch {
      cookies[key] = part.slice(index + 1).trim()
    }
  }
  return cookies
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

export function siteUrl(req) {
  const configured = process.env.SITE_URL
  if (configured) return configured.replace(/\/+$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173'
  return `${proto}://${host}`
}
