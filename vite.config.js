import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

function localApi() {
  return {
    name: 'lephas-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/sitemap.xml') req.url = '/api/seo/sitemap'
        else if (req.url === '/robots.txt') req.url = '/api/seo/robots'
        if (!req.url || !req.url.startsWith('/api/')) return next()
        try {
          const { handle } = await import('./server/router.js')
          await handle(req, res)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

function siteMeta(siteUrl) {
  return {
    name: 'lephas-site-meta',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', siteUrl)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const siteUrl = (process.env.SITE_URL || (productionHost ? `https://${productionHost}` : '')).replace(/\/+$/, '')
  return {
    plugins: [react(), tailwindcss(), localApi(), siteMeta(siteUrl)],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
    },
  }
})
