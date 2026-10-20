# Lephas Website

The website of Lephas, a freelancing company that builds custom websites (e-commerce, company sites, web apps) for clients.
Built with React (Vite) and Tailwind CSS, with serverless functions in `/api`, hosted free on Vercel.

## Team streams

| Stream | Works in | Owns |
| --- | --- | --- |
| Backend | `api/`, `supabase/` | API, database, email, admin security |
| Frontend | `src/` | Pages, components, styling, API calls |
| QA | `tests/`, `docs/qa/` | Test plan, automated tests, bug tracking, sign-off |

Full plan with tasks per stream: see the project plan document shared with the team.

## Folder structure

```text
api/          Backend: serverless functions (one file per endpoint)
supabase/     Backend: database schema
src/
  components/ Shared components (Layout, Navbar, Footer, ...)
  pages/      One file per page
  services/   API calls, one place only (api.js)
tests/        QA: unit, end-to-end and API tests
docs/         API contract and QA test plan
```

## Getting started

```bash
git clone https://github.com/LEPHAS-COMPANY-LTD/Lephas-website.git
cd Lephas-website
npm install
cp .env.example .env     # then fill in the values
npm run dev              # frontend at http://localhost:5173
```

To run the `/api` functions locally, install the Vercel CLI (`npm i -g vercel`) and use `vercel dev` instead of `npm run dev`.

## Git rules

- `main` is always deployable and is what Vercel publishes. Nobody pushes to it directly.
- Work on short branches named `backend/<task>`, `frontend/<task>`, `qa/<task>`.
- Every change goes through a pull request reviewed by one other member.
  Vercel builds a preview link for each pull request, and QA tests on that link.
- Secrets go only in Vercel environment variables and local `.env` files, never in the repo.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the frontend dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Check code with Oxlint |

## Deploying on Vercel

Import the repo in Vercel (framework preset: Vite, build command `npm run build`, output `dist`).
Add the variables from `.env.example` under Project Settings, Environment Variables.
Every push to `main` publishes to production; every pull request gets a preview link.
