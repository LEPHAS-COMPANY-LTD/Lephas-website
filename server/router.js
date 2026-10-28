import { HttpError, Reply, sendError, sendJson } from './http.js'
import publicRoutes from './routes/public.js'
import inquiryRoutes from './routes/inquiries.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import teamRoutes from './routes/team.js'
import billingRoutes from './routes/billing.js'

const routes = [...publicRoutes, ...inquiryRoutes, ...authRoutes, ...adminRoutes, ...teamRoutes, ...billingRoutes].map((route) => {
  const keys = []
  const pattern = route.path.replace(/:([a-zA-Z_]+)/g, (_, key) => {
    keys.push(key)
    return '([^/]+)'
  })
  return { ...route, keys, regex: new RegExp(`^${pattern}/?$`) }
})

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

function resolvePath(url) {
  let pathname = url.pathname
  if (pathname === '/api/router' && url.searchParams.has('path')) {
    pathname = `/api/${url.searchParams.get('path')}`
    url.searchParams.delete('path')
  }
  return pathname.replace(/\/{2,}/g, '/')
}

export async function handle(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost')
    const pathname = resolvePath(url)
    const method = (req.method || 'GET').toUpperCase()

    if (method !== 'GET' && method !== 'HEAD') {
      if (req.headers['x-lephas-client'] !== '1') {
        throw new HttpError(403, 'Requests must come from the Lephas website.')
      }
      const origin = req.headers.origin
      const allowed = allowedOrigins()
      if (origin && allowed.length > 0 && !allowed.includes(origin.replace(/\/+$/, ''))) {
        throw new HttpError(403, 'This origin is not allowed.')
      }
    }

    let pathMatched = false
    for (const route of routes) {
      const match = route.regex.exec(pathname)
      if (!match) continue
      pathMatched = true
      if (route.method !== method && !(method === 'HEAD' && route.method === 'GET')) continue
      const params = {}
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1])
      })
      const result = await route.handler({ req, res, params, query: url.searchParams })
      if (res.writableEnded) return
      if (result instanceof Reply) return sendJson(res, result.status, result.body, result.headers)
      return sendJson(res, 200, result ?? {})
    }
    if (pathMatched) throw new HttpError(405, 'This method is not allowed here.')
    throw new HttpError(404, 'This API endpoint does not exist.')
  } catch (error) {
    return sendError(res, error)
  }
}
