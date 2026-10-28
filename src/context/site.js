import { createContext, useContext } from 'react'

export const defaultSite = { settings: { currency: 'USD' }, counts: { team: 0, projects: 0, services: 0 }, loaded: false }
export const SiteContext = createContext(defaultSite)

export function useSite() {
  return useContext(SiteContext)
}
