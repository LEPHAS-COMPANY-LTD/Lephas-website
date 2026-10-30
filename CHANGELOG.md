# Changelog

All notable changes to the Lephas website. Versions follow [semantic versioning](https://semver.org):
MAJOR for big changes, MINOR for new features, PATCH for fixes. Update `version` in `package.json` with each release.

## 1.0.0 (first release)

- Public site: Home, Services, Hire talent with full profiles (photo, skills, rate, GitHub, LinkedIn, portfolio), Portfolio, Process, Pricing, About, Contact.
- Clients reach Lephas: Start a project (3-step form), Hire a developer, contact form, WhatsApp, email and phone.
- Private request page per client with a two-way conversation and email notifications.
- Quotations and invoices: create from a request, send, client accepts online, convert to invoice, record payments, print or save as PDF.
- Admin area with roles: CTO (only one), Admin, Staff. Only the CTO manages team profiles, staff accounts and settings.
- Neumorphism design in the logo colours, light mode by default with an optional dark mode.
- Privacy policy and terms pages, linked from the footer and the request forms. The data protection registration number can be added in Contact settings once registered.
- SEO: `robots.txt`, a sitemap that includes team profiles and projects, and a share image for WhatsApp, LinkedIn and other social links.
- Security headers on every page.
- PostgreSQL database with migrations, ready to deploy on Vercel.
- GitHub Actions runs lint, build and API tests on every push and pull request.
- Emails can now be sent through Gmail (or any SMTP server) using an app password. Set `SMTP_USER` and `SMTP_PASS`.
  When a client sends a request, the team gets a professional notification email and the client gets a confirmation
  with their reference number and private link. Resend still works if `EMAIL_API_KEY` is set instead.
- Optional RabbitMQ email queue. With `RABBITMQ_URL` set, the website puts each email on the `lephas.emails` queue
  and returns at once; `npm run email-worker` sends them, retrying up to 4 times, and moves emails that still fail
  to `lephas.emails.failed`. If RabbitMQ is down, emails are sent directly so nothing is lost.
- A failing mail server never blocks a client's request; it is saved and shown in the dashboard either way.
