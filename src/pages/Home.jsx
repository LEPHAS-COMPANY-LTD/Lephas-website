import { Link } from 'react-router-dom'

// TODO (Frontend): hero, services summary, featured projects, how it works, final call to action.
export default function Home() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-4xl font-bold">Custom websites, built for your business</h1>
      <p className="mx-auto mt-4 max-w-2xl text-muted">
        Lephas designs and builds e-commerce stores, company websites and web apps.
      </p>
      <Link
        to="/contact"
        className="mt-8 inline-block rounded bg-brand px-6 py-3 text-white"
      >
        Request a Quote
      </Link>
    </section>
  )
}
