# Lephas Website

The website of Lephas Company Ltd, a software company that builds websites, web and mobile apps, e-commerce stores,
POS and business systems, and APIs.

Clients can start a project, hire a specific developer, or send a message. Each request gets a reference number and a
private page where the client and the Lephas team talk. Staff manage everything from `/admin`.

Built with React (Vite) and Tailwind CSS, a Node API in `server/`, and PostgreSQL. Hosted on Vercel.

## What is in the site

| Area | Pages |
| --- | --- |
| Reach clients | Home, Services, Hire talent (team directory and profiles), Portfolio, Process, Pricing, About |
| Clients reach us | Start a project (3-step form), Hire a developer, Contact form, WhatsApp, email and phone buttons |
| Two-way conversation | `/requests/:reference` private page for the client, inbox and replies in `/admin` |
| Quotations and invoices | Created from a request in `/admin`, sent to the client, accepted online, paid, printed or saved as PDF |
| Admin | Requests inbox, quotes and invoices, portfolio projects, services, team profiles, staff accounts, contact settings |

Roles in the admin area:

| Role | Can do |
| --- | --- |
| CTO (only one) | Everything, including team profiles, staff accounts and contact settings |
| Admin | Requests, quotes and invoices, portfolio projects and services |
| Staff | Requests (can view quotes and invoices) |

## Team streams

| Stream | Works in | Owns |
| --- | --- | --- |
| Backend | `server/`, `api/`, `db/`, `scripts/` | API, database, email, admin security |
| Frontend | `src/` | Pages, components, styling, API calls |
| QA | `tests/`, `docs/qa/` | Test plan, automated tests, bug tracking, sign-off |

## Folder structure

```text
api/router.js   Vercel function: every /api request goes through it
server/         Backend: router, auth, validation, email, routes per area
db/migrations/  Database schema, applied in order by npm run db:migrate
scripts/        Migrate, seed services, create the CTO account
src/
  admin/        Admin area (lazy-loaded)
  components/   Shared components (Layout, Navbar, Footer, cards, form fields, icons)
  context/      Site settings shared by all pages
  lib/          Helpers (formatting, data loading)
  pages/        One file per public page
  services/     API calls, one place only (api.js)
tests/api/      Automated API tests
docs/           API contract and QA test plan
```

## Design

Neumorphism, using only the colours of the logo (`public/logo.svg`):

| Token | Colour | Used for |
| --- | --- | --- |
| `slate` | `#3A4650` | Text, primary buttons |
| `sky` | `#8DBFE3` | Highlights, focus rings, accents |
| `ice` | `#EEF5FB` | Light text on dark buttons |
| `silver` | `#D6DADD` | Subtle badges and numbers |
| `base` | `#E7EEF5` | Page and surface background |

The reusable classes (`neu`, `neu-inset`, `btn`, `btn-primary`, `field`, `chip`...) are in `src/index.css`.

## Getting started

You need Node.js 22.9 or newer and a PostgreSQL database (local, or a free one from Neon or Vercel Postgres).

```bash
git clone https://github.com/LEPHAS-COMPANY-LTD/Lephas-website.git
cd Lephas-website
npm install
cp .env.example .env          # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate            # create the tables
npm run db:seed               # add the default services
npm run create-cto -- "Full Name" cto@example.com "a-strong-password"
npm run dev                   # site and API at http://localhost:5173
```

Log in at http://localhost:5173/admin with the CTO account, then:

1. Contact settings: add the email, phone and WhatsApp number, and under Quotes & invoices your tax number,
   tax rate and payment instructions (bank account, M-Pesa Paybill...).
2. Team profiles: add the owners and employees, with photo, skills, GitHub and LinkedIn, and publish them.
3. Portfolio: add projects and tick who worked on them.
4. Staff accounts: create accounts for the rest of the team.

## Quotations and invoices

1. Open a client request in `/admin` and press **Quotation** (after a free-quote request) or **Invoice**
   (for example after a client hires a developer). Client details, the service or the developer's hourly rate are
   filled in for you.
2. Edit the lines, discount and tax, preview it, then **Save and send to client**. It gets a number such as
   `QT-2026-0001` and the client receives a link.
3. The client opens it from their request page and presses **Accept** or **Decline**.
4. Press **Convert to invoice** on an accepted quotation, send it, then **Record payment** as money arrives
   (bank, mobile money, card or cash). The invoice shows Partially paid, Paid or Overdue.
5. Anyone can press **Print or save as PDF** for a clean A4 copy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the site and API locally |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Check code with Oxlint |
| `npm test` | API tests (needs `TEST_DATABASE_URL`) |
| `npm run db:migrate` | Apply new database migrations |
| `npm run db:seed` | Add the default services (safe to run again) |
| `npm run create-cto` | Create the single CTO account |

To change the database, add a new file in `db/migrations/` (for example `002_add_reviews.sql`). Never edit a
migration that has already been applied.

## Deploying on Vercel

1. Create a Postgres database (Vercel Storage, Neon or similar) and copy its connection string.
2. Import the repo in Vercel (framework preset: Vite, build command `npm run build`, output `dist`).
3. Under Project Settings, Environment Variables, add: `DATABASE_URL`, `AUTH_SECRET`, `SITE_URL`
   (e.g. `https://lephas.com`, also used for share previews and the sitemap), and for emails `EMAIL_API_KEY`,
   `EMAIL_FROM`, `TEAM_NOTIFICATION_EMAIL`.
4. From your computer, with `DATABASE_URL` in `.env` pointing at that database, run `npm run db:migrate`,
   `npm run db:seed` and `npm run create-cto`.

`vercel.json` sends every `/api/...` request to `api/router.js` and every other path to the React app.
Emails are sent through Resend. Without `EMAIL_API_KEY` the site still works: staff can copy the client's private link
from the request page and send it by WhatsApp or SMS.

## Automatic checks

`.github/workflows/ci.yml` runs lint, the production build and the API tests (against a temporary Postgres) on every
push to `main` or `Dev` and on every pull request. A red cross on GitHub means something is broken; open the run to see why.

## Versions

The current version is in `package.json` (now **1.0.0**) and is shown in the website footer, the admin sidebar
and `GET /api/health`. For each release, raise the version in `package.json` and add a section to `CHANGELOG.md`.

## Git rules

- `main` is always deployable and is what Vercel publishes. Nobody pushes to it directly.
- Work on short branches named `backend/<task>`, `frontend/<task>`, `qa/<task>` or `feature/<task>`.
- Every change goes through a pull request reviewed by one other member.
  Vercel builds a preview link for each pull request, and QA tests on that link.
- Secrets go only in Vercel environment variables and local `.env` files, never in the repo.
