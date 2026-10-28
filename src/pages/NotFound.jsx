import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/useAsync.js'

export default function NotFound() {
  usePageMeta('Page not found')
  return (
    <section className="py-16 text-center">
      <div className="neu-lg mx-auto max-w-lg p-10">
        <p className="text-6xl font-bold text-silver">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate">Page not found</h1>
        <p className="mt-2 text-muted">The page you are looking for does not exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/contact" className="btn">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  )
}
