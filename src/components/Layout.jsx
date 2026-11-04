import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import Icon from './Icon.jsx'
import { useSite } from '../context/site.js'
import { whatsappLink } from '../lib/format.js'

export default function Layout() {
  const { pathname, hash } = useLocation()
  const { settings } = useSite()
  const whatsapp = whatsappLink(settings.whatsapp_number, 'Hello Lephas, I would like to talk about a project.')

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return undefined
    }
    let tries = 0
    const timer = setInterval(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target || ++tries > 20) {
        clearInterval(timer)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    return () => clearInterval(timer)
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
        <Outlet />
      </main>
      <Footer />
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sky fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full p-0 sm:h-auto sm:w-auto sm:px-5"
          aria-label="Chat with us on WhatsApp"
        >
          <Icon name="whatsapp" size={24} />
          <span className="hidden sm:inline">Chat with us</span>
        </a>
      )}
    </div>
  )
}
