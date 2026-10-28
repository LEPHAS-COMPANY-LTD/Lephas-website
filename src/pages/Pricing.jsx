import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { ErrorState, Loader, PageHeader, SectionTitle } from '../components/ui.jsx'
import { api } from '../services/api.js'
import { useAsync, usePageMeta } from '../lib/useAsync.js'
import { useSite } from '../context/site.js'
import { priceLabel } from '../lib/format.js'

const models = [
  {
    icon: 'receipt',
    title: 'Fixed-price project',
    best: 'Websites, stores and apps with a clear scope',
    points: ['One agreed price before work starts', 'Paid in milestones', 'Changes quoted separately'],
    engagement: 'fixed',
  },
  {
    icon: 'clock',
    title: 'Hourly',
    best: 'Ongoing changes, fixes and evolving products',
    points: ['Hire a specific developer', 'Pay only for hours worked', 'Weekly time reports'],
    engagement: 'hourly',
    featured: true,
  },
  {
    icon: 'users',
    title: 'Monthly retainer',
    best: 'Businesses that need a dedicated developer or team',
    points: ['Reserved hours every month', 'Priority support', 'Predictable monthly cost'],
    engagement: 'monthly',
  },
]

const faqs = [
  { q: 'How much does a website cost?', a: 'It depends on the number of pages, features and integrations. Send your idea and we will reply with a written quote, usually within one business day.' },
  { q: 'Do I need to pay before work starts?', a: 'For fixed-price projects we usually ask for a deposit, then payments at agreed milestones. Hourly and monthly work is billed in arrears.' },
  { q: 'Who owns the code and design?', a: 'You do. When the project is paid we hand over the source code, designs and all accounts.' },
  { q: 'Can I hire one developer for a few hours?', a: 'Yes. Open any profile on the Hire talent page and press Hire. Their hourly rate is shown on the profile.' },
]

export default function Pricing() {
  usePageMeta('Pricing', 'Fixed-price, hourly and monthly options for websites, apps and systems built by Lephas.')
  const { settings } = useSite()
  const { data, error, loading, reload } = useAsync((opts) => api.services(opts), [])
  const services = data?.services ?? []

  return (
    <div className="space-y-20">
      <PageHeader eyebrow="Pricing" title="Simple ways to work with us">
        Choose the model that fits your project. Every quote is written down before any work starts.
      </PageHeader>

      <div className="grid gap-7 md:grid-cols-3">
        {models.map((model) => (
          <article key={model.title} className={`${model.featured ? 'neu-lg' : 'neu'} flex flex-col p-8`}>
            <span className="icon-well">
              <Icon name={model.icon} />
            </span>
            <h2 className="mt-5 text-xl font-bold text-slate">{model.title}</h2>
            <p className="mt-1 text-sm text-muted">{model.best}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {model.points.map((point) => (
                <li key={point} className="flex gap-2 text-sm text-slate">
                  <Icon name="check" size={18} className="shrink-0 text-sky-deep" />
                  {point}
                </li>
              ))}
            </ul>
            <Link to="/start" className={`btn mt-8 ${model.featured ? 'btn-primary' : ''}`}>
              Get a quote
            </Link>
          </article>
        ))}
      </div>

      <section>
        <SectionTitle eyebrow="Starting prices" title="Typical starting points by service">
          Final prices depend on your scope. Services without a price are always quoted individually.
        </SectionTitle>
        {loading && <Loader />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {services.length > 0 && (
          <div className="neu overflow-hidden p-2 sm:p-4">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Starting prices by service</caption>
              <thead>
                <tr className="text-xs uppercase tracking-widest text-muted">
                  <th scope="col" className="px-4 py-3">Service</th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">Typical delivery</th>
                  <th scope="col" className="px-4 py-3">Price</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-t border-silver/60">
                    <th scope="row" className="px-4 py-4 font-semibold text-slate">{service.name}</th>
                    <td className="hidden px-4 py-4 text-muted sm:table-cell">{service.delivery_estimate || 'Depends on scope'}</td>
                    <td className="px-4 py-4 font-semibold text-slate">{priceLabel(service, settings.currency)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link to={`/start?service=${service.slug}`} className="btn btn-sm">
                        Quote
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="Questions" title="Frequently asked" />
        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq) => (
            <details key={faq.q} className="neu-sm group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate">
                {faq.q}
                <Icon name="plus" size={18} className="shrink-0 transition group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
