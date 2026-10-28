import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { SiteContext, defaultSite } from './site.js'

export function SiteProvider({ children }) {
  const [site, setSite] = useState(defaultSite)
  useEffect(() => {
    const controller = new AbortController()
    api
      .site({ signal: controller.signal })
      .then((data) => setSite({ ...data, loaded: true }))
      .catch(() => setSite((prev) => ({ ...prev, loaded: true })))
    return () => controller.abort()
  }, [])
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>
}
