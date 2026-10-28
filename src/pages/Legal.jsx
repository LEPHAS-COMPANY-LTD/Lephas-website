import { Link } from 'react-router-dom'
import { useSite } from '../context/site.js'
import { usePageMeta } from '../lib/useAsync.js'

const UPDATED = '28 October 2026'

function LegalLayout({ title, intro, children }) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-10 text-center">
        <span className="eyebrow">Legal</span>
        <h1 className="mt-3 text-3xl font-bold text-slate sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated: {UPDATED}</p>
        {intro && <p className="mx-auto mt-5 max-w-2xl text-muted">{intro}</p>}
      </header>
      <div className="neu space-y-8 p-6 text-[0.95rem] leading-relaxed text-muted sm:p-10">{children}</div>
    </article>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ContactLine() {
  const { settings } = useSite()
  if (settings.contact_email) {
    return (
      <>
        email us at{' '}
        <a href={`mailto:${settings.contact_email}`} className="font-semibold text-sky-deep underline">
          {settings.contact_email}
        </a>{' '}
        or use our{' '}
      </>
    )
  }
  return <>use our </>
}

export function Privacy() {
  usePageMeta('Privacy policy', 'How Lephas Company Ltd collects, uses and protects your personal information.')
  const { settings } = useSite()
  return (
    <LegalLayout
      title="Privacy policy"
      intro="This policy explains what personal information Lephas Company Ltd collects through this website, why we collect it, and the choices you have."
    >
      <Section title="Who we are">
        <p>
          This website is run by Lephas Company Ltd (“Lephas”, “we”, “us”). We are responsible for the personal information you
          share with us here. To contact us about your information, <ContactLine />
          <Link to="/contact" className="font-semibold text-sky-deep underline">
            contact form
          </Link>
          .
        </p>
        {settings.data_protection_registration && (
          <p>Data protection registration number: {settings.data_protection_registration}.</p>
        )}
      </Section>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate">Details you give us</strong> when you start a project, hire a developer or send a message:
            your name, email, phone number, company, country, preferred way to be contacted and the details of your project.
          </li>
          <li>
            <strong className="text-slate">Conversation and billing records:</strong> messages between you and our team, quotations
            and invoices we send you, your responses to them and payments we record.
          </li>
          <li>
            <strong className="text-slate">Technical information:</strong> to protect the site from abuse we use your IP address to
            limit how many requests can be sent. We store it only in a scrambled (hashed) form for this purpose.
          </li>
          <li>
            <strong className="text-slate">Information stored in your browser:</strong> your light or dark mode choice and links to
            requests you sent from that device. This stays on your device and you can clear it at any time. Team members who log in
            also receive a login cookie. We do not use advertising or tracking cookies.
          </li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>To reply to your request and keep the conversation in one place.</li>
          <li>To prepare quotations, carry out the work you hire us for, send invoices and record payments.</li>
          <li>To meet our legal, tax and accounting obligations.</li>
          <li>To keep the website and our systems secure.</li>
        </ul>
        <p>
          We use your information because it is needed to take steps you ask for before a contract and to perform our contract with
          you, because we have a legitimate interest in running and protecting our business, or because the law requires it. We do
          not sell your personal information and we do not use it for unrelated marketing without your permission.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>
          Only the Lephas team members who need it can see your information. We also use trusted service providers to run the
          website, store data and send emails (for example our hosting, database and email providers). They process your
          information on our behalf and only for these purposes. We may share information if the law requires it.
        </p>
        <p>
          Some of these providers may store or process data outside your country. When that happens we rely on providers that
          protect personal information to a recognised standard.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep requests and conversations for as long as needed to respond to you and deliver any project. Quotations, invoices
          and payment records are kept for as long as tax and accounting laws require. When information is no longer needed we
          delete it or make it anonymous.
        </p>
      </Section>

      <Section title="How we protect it">
        <p>
          Your private request page can only be opened with a secret link sent to you. The site uses encrypted connections (HTTPS),
          team accounts are protected by passwords and access levels, and we limit who can see client information.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on the law that applies to you, you can ask to see the personal information we hold about you, correct it, have
          it deleted, object to or limit how we use it, or receive a copy. To make a request, <ContactLine />
          <Link to="/contact" className="font-semibold text-sky-deep underline">
            contact form
          </Link>
          . We may need to confirm your identity first. If you are not happy with our answer, you can complain to the data
          protection authority in your country.
        </p>
      </Section>

      <Section title="Children">
        <p>Our services are for businesses and adults. We do not knowingly collect information from children.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>We may update this policy from time to time. The date at the top shows when it last changed.</p>
      </Section>
    </LegalLayout>
  )
}

export function Terms() {
  usePageMeta('Terms of service', 'The terms for using the Lephas website and working with Lephas Company Ltd.')
  return (
    <LegalLayout
      title="Terms of service"
      intro="These terms apply when you use this website and when you request, accept or pay for services from Lephas Company Ltd. A signed agreement or accepted quotation for a specific project takes priority over these general terms."
    >
      <Section title="Using this website">
        <p>
          You may use this website to learn about our services, contact us and manage your requests. Please do not misuse it, try to
          access areas you are not allowed to, or send content that is unlawful or harmful. Keep the private links to your requests
          safe: anyone with a link can read and reply to that conversation.
        </p>
      </Section>

      <Section title="Requests and quotations">
        <p>
          Sending a request does not create a contract. When we send a quotation, it describes the work, the price and how long the
          offer is valid. A project starts once you accept the quotation and any agreed deposit is paid. Work not listed in the
          quotation is quoted separately.
        </p>
      </Section>

      <Section title="Invoices and payment">
        <p>
          Invoices must be paid by the due date shown on them, using the payment details provided, with the invoice number as the
          payment reference. For hourly or monthly work we invoice for the time and period agreed. We may pause work while invoices
          are overdue.
        </p>
      </Section>

      <Section title="Your materials and responsibilities">
        <p>
          You are responsible for the content, logos, text and data you give us, and for having the right to use them. Please give us
          timely feedback and access to anything we need so we can keep to the agreed timeline.
        </p>
      </Section>

      <Section title="Ownership">
        <p>
          Once a project is paid in full, you own the final website, app or system we built for you, including the source code and
          designs made specifically for you. We may reuse general tools, libraries and know-how that are not specific to you. Unless
          you tell us otherwise, we may mention the project in our portfolio.
        </p>
      </Section>

      <Section title="Confidentiality">
        <p>We keep your business information confidential and only share it with team members and providers who need it for your project.</p>
      </Section>

      <Section title="Warranties and liability">
        <p>
          We build with care and fix defects in the work we delivered that are reported within the support period agreed for your
          project. We are not responsible for problems caused by third-party services, hosting, or changes made by others. To the
          extent the law allows, our total liability for a project is limited to the amount you paid for it.
        </p>
      </Section>

      <Section title="Ending a project">
        <p>
          Either side may end a project in writing if the other seriously breaks these terms. You pay for work completed up to that
          point, and we hand over the finished parts that have been paid for.
        </p>
      </Section>

      <Section title="Changes and governing law">
        <p>
          We may update these terms. The version published when you accept a quotation applies to that project. These terms are
          governed by the laws of the country where Lephas Company Ltd is registered.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          If you have any questions about these terms,{' '}
          <Link to="/contact" className="font-semibold text-sky-deep underline">
            contact us
          </Link>
          .
        </p>
      </Section>
    </LegalLayout>
  )
}
