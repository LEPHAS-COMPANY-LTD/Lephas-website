import { BILLING_TONES, PAYMENT_METHODS, formatCents, longDate } from '../lib/billing.js'
import { labelOf } from '../lib/format.js'

const STAMP = {
  paid: 'PAID',
  void: 'VOID',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
  overdue: 'OVERDUE',
  expired: 'EXPIRED',
  draft: 'DRAFT',
}

export function BillingBadge({ status, label }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${BILLING_TONES[status] ?? 'bg-silver text-slate'}`}>{label}</span>
}

export default function BillingDocument({ document: doc, settings }) {
  const isQuote = doc.kind === 'quote'
  const title = isQuote ? 'Quotation' : 'Invoice'
  const stamp = STAMP[doc.display_status]
  const company = [
    settings.office_address,
    settings.contact_email,
    settings.contact_phone,
    settings.tax_number && `Tax / Reg. No: ${settings.tax_number}`,
  ].filter(Boolean)
  const client = [doc.client.company, doc.client.address, doc.client.email, doc.client.phone].filter(Boolean)

  return (
    <article className="billing-paper relative mx-auto w-full max-w-[52rem] overflow-hidden bg-white px-6 py-8 text-slate sm:px-12 sm:py-12" aria-label={`${title} ${doc.number ?? 'draft'}`}>
      {stamp && (
        <span
          className={`pointer-events-none absolute right-6 top-28 rotate-[-12deg] rounded-xl border-4 px-4 py-1 text-xl font-bold tracking-[0.3em] opacity-80 sm:right-12 sm:top-32 sm:text-2xl ${
            doc.display_status === 'paid' || doc.display_status === 'accepted' ? 'border-slate text-slate' : 'border-[#b4544a] text-[#b4544a]'
          }`}
          aria-hidden="true"
        >
          {stamp}
        </span>
      )}

      <header className="flex flex-col justify-between gap-6 border-b-2 border-slate pb-6 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="" width="76" height="76" className="h-[76px] w-[76px]" />
          <div>
            <p className="text-lg font-bold tracking-wide">LEPHAS COMPANY LTD</p>
            <p className="text-xs tracking-[0.2em] text-muted">TRANSFORMING THE FUTURE</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-3xl font-bold uppercase tracking-[0.15em] text-slate">{title}</p>
          <p className="mt-1 text-sm font-semibold">{doc.number ?? 'Draft'}</p>
        </div>
      </header>

      <section className="grid gap-6 py-6 text-sm sm:grid-cols-3">
        <div>
          <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">From</p>
          <p className="font-semibold">Lephas Company Ltd</p>
          {company.map((line) => (
            <p key={line} className="whitespace-pre-line text-muted">
              {line}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">{isQuote ? 'Prepared for' : 'Bill to'}</p>
          <p className="font-semibold">{doc.client.name}</p>
          {client.map((line) => (
            <p key={line} className="whitespace-pre-line text-muted">
              {line}
            </p>
          ))}
        </div>
        <dl className="space-y-1.5 sm:text-right">
          <div>
            <dt className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">Date issued</dt>
            <dd className="font-semibold">{longDate(doc.issue_date)}</dd>
          </div>
          {doc.due_date && (
            <div>
              <dt className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">{isQuote ? 'Valid until' : 'Due date'}</dt>
              <dd className="font-semibold">{longDate(doc.due_date)}</dd>
            </div>
          )}
          {doc.reference && (
            <div>
              <dt className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">Request</dt>
              <dd className="font-semibold">{doc.reference}</dd>
            </div>
          )}
        </dl>
      </section>

      <p className="mb-4 text-[1rem] font-bold">{doc.title}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead>
            <tr className="bg-ice text-[0.7rem] uppercase tracking-[0.15em] text-slate">
              <th scope="col" className="w-10 px-3 py-3">#</th>
              <th scope="col" className="px-3 py-3">Description</th>
              <th scope="col" className="px-3 py-3 text-right">Qty</th>
              <th scope="col" className="px-3 py-3 text-right">Unit price</th>
              <th scope="col" className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, index) => (
              <tr key={item.id ?? index} className="border-b border-silver align-top">
                <td className="px-3 py-3 text-muted">{index + 1}</td>
                <td className="whitespace-pre-line px-3 py-3">{item.description}</td>
                <td className="px-3 py-3 text-right">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </td>
                <td className="px-3 py-3 text-right">{formatCents(item.unit_price_cents, doc.currency)}</td>
                <td className="px-3 py-3 text-right font-semibold">{formatCents(item.amount_cents, doc.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatCents(doc.subtotal_cents, doc.currency)}</dd>
          </div>
          {doc.discount_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd>-{formatCents(doc.discount_cents, doc.currency)}</dd>
            </div>
          )}
          {doc.tax_rate > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">
                {doc.tax_label} ({doc.tax_rate}%)
              </dt>
              <dd>{formatCents(doc.tax_cents, doc.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-slate pt-2 text-[1rem] font-bold">
            <dt>Total ({doc.currency})</dt>
            <dd>{formatCents(doc.total_cents, doc.currency)}</dd>
          </div>
          {!isQuote && doc.paid_cents > 0 && (
            <>
              <div className="flex justify-between">
                <dt className="text-muted">Paid</dt>
                <dd>-{formatCents(doc.paid_cents, doc.currency)}</dd>
              </div>
              <div className="flex justify-between rounded-lg bg-ice px-2 py-1.5 font-bold">
                <dt>Balance due</dt>
                <dd>{formatCents(doc.balance_cents, doc.currency)}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {!isQuote && doc.payments?.length > 0 && (
        <section className="mt-8 text-sm">
          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">Payments received</p>
          <ul className="space-y-1">
            {doc.payments.map((p, index) => (
              <li key={p.id ?? index} className="flex justify-between border-b border-silver/70 py-1">
                <span>
                  {longDate(p.paid_on)} · {labelOf(PAYMENT_METHODS, p.method)}
                </span>
                <span>{formatCents(p.amount_cents, doc.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
        {!isQuote && settings.payment_instructions && (
          <section className="rounded-2xl bg-ice p-5 sm:col-span-2">
            <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">How to pay</p>
            <p className="whitespace-pre-line">{settings.payment_instructions}</p>
            {doc.number && <p className="mt-2 font-semibold">Payment reference: {doc.number}</p>}
          </section>
        )}
        {doc.notes && (
          <section>
            <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">Notes</p>
            <p className="whitespace-pre-line text-muted">{doc.notes}</p>
          </section>
        )}
        {doc.terms && (
          <section>
            <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-sky-deep">Terms</p>
            <p className="whitespace-pre-line text-muted">{doc.terms}</p>
          </section>
        )}
      </div>

      <footer className="mt-10 border-t border-silver pt-5 text-center text-xs text-muted">
        <p className="font-semibold text-slate">Thank you for choosing Lephas Company Ltd.</p>
        <p className="mt-1">{[settings.contact_email, settings.contact_phone, settings.office_address].filter(Boolean).join(' · ')}</p>
      </footer>
    </article>
  )
}
