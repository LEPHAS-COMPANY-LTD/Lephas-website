# API contract

All endpoints live under `/api`. On Vercel they are served by one function, `api/router.js`, which hands each
request to `server/router.js`. Locally, `npm run dev` serves the same router inside Vite.

All responses are JSON. Errors always use `{ "error": "message" }` with the right status code
(400 invalid input, 401 not logged in, 403 not allowed, 404 not found, 429 too many requests, 500 server error).
Validation errors also include `fields`, for example `{ "error": "Please fix the highlighted fields.", "fields": { "email": "Enter a valid email address." } }`.

Every `POST`, `PUT`, `PATCH` and `DELETE` request must send the header `X-Lephas-Client: 1` (the frontend does this in
`src/services/api.js`). Requests without it are rejected with 403, which blocks cross-site form attacks.

## Public

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `GET /api/site` | Contact settings and public counts |
| `GET /api/services` | Active services |
| `GET /api/team` | Published team profiles. Filters: `?q=`, `?skill=`, `?availability=`, `?type=owner` |
| `GET /api/team/:slug` | One profile with the projects they worked on |
| `GET /api/projects` | Published projects. Filters: `?featured=true`, `?service=<slug>` |
| `GET /api/projects/:slug` | One project with its team |
| `GET /api/media/:id` | An uploaded image |
| `POST /api/inquiries` | Send a project, hire or contact request (rate limited: 6 per hour per IP) |
| `GET /api/inquiries/:reference?token=` | Client's private request page with the conversation |
| `POST /api/inquiries/:reference/messages` | Client reply `{ token, message }` |
| `POST /api/inquiries/lookup` | Email all request links to `{ email }` |
| `GET /api/inquiries/:reference/documents/:id?token=` | A sent quotation or invoice for that request |
| `GET /api/inquiries/:reference/documents/:id/pdf?token=` | Download that quotation or invoice as a PDF |
| `POST /api/inquiries/:reference/documents/:id/decision` | Client accepts or declines a quotation `{ token, decision: accept \| decline, note }` |

### `POST /api/inquiries`

```json
{
  "kind": "project",
  "service_id": "uuid (required for kind=project)",
  "team_member_slug": "jane-doe (required for kind=hire)",
  "full_name": "Ada Client",
  "email": "ada@example.com",
  "phone": "+254 700 000000",
  "company": "Ada Ltd",
  "country": "Kenya",
  "preferred_contact": "email | phone | whatsapp",
  "engagement": "fixed | hourly | monthly | not_sure",
  "budget_range": "under_500 | 500_2000 | 2000_5000 | 5000_15000 | over_15000 | not_sure",
  "timeline": "asap | 1_month | 1_3_months | 3_6_months | flexible",
  "subject": "Online shop",
  "details": "At least 20 characters"
}
```

`201` response: `{ "reference": "LPH-2026-0001", "token": "...", "tracking_url": "https://.../requests/LPH-2026-0001?token=..." }`.
The token is only returned once. It is stored hashed for checking and encrypted so staff can resend the link.

## Auth

| Method and path | Purpose |
| --- | --- |
| `POST /api/auth/login` | `{ email, password }`, sets an HTTP-only session cookie (12 hours) |
| `POST /api/auth/logout` | Clears the session |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/password` | `{ current_password, new_password }` |

## Admin (session required)

Roles: `cto` (exactly one), `admin`, `staff`.

| Method and path | Who | Purpose |
| --- | --- | --- |
| `GET /api/admin/overview` | all | Dashboard counts |
| `GET /api/admin/inquiries` | all | List. Filters: `?status=` (or `open`), `?kind=`, `?q=` |
| `GET /api/admin/inquiries/:id` | all | One request, conversation and the client link |
| `PATCH /api/admin/inquiries/:id` | all | `{ status, assigned_to }` |
| `POST /api/admin/inquiries/:id/messages` | all | Team reply `{ message, status? }`, emails the client |
| `DELETE /api/admin/inquiries/:id` | cto, admin | Delete a request |
| `GET/POST /api/admin/services`, `PUT/DELETE /api/admin/services/:id` | read: all, write: cto, admin | Services |
| `GET/POST /api/admin/projects`, `PUT/DELETE /api/admin/projects/:id` | read: all, write: cto, admin | Portfolio projects and their team members |
| `POST /api/admin/media` | cto, admin | Upload an image `{ data: base64, mime_type }` (JPEG, PNG, WebP, max 1.5 MB) |
| `GET /api/admin/members` | all | Team names for pickers |
| `GET/POST /api/admin/team`, `PUT/DELETE /api/admin/team/:id` | **cto only** | Owner and employee profiles |
| `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id` | **cto only** | Staff accounts |
| `GET /api/admin/settings` | all | Contact settings |
| `PUT /api/admin/settings` | **cto only** | Change contact settings |

## Quotations and invoices

Every quotation or invoice belongs to a client request. Drafts have no number and are invisible to the client.
Sending one gives it a number (`QT-2026-0001`, `INV-2026-0001`), adds a line to the conversation and emails the client a link.
Amounts are stored in cents. Totals are always recalculated on the server: subtotal, minus discount, plus tax.

| Method and path | Who | Purpose |
| --- | --- | --- |
| `GET /api/admin/billing` | all | List. Filters: `?kind=quote\|invoice`, `?status=`, `?q=`. Also returns outstanding totals per currency |
| `GET /api/admin/billing/:id` | all | One document with payments |
| `POST /api/admin/billing` | cto, admin | Create a draft `{ kind, inquiry_id, title, client_*, currency, issue_date, due_date, discount, tax_label, tax_rate, notes, terms, items: [{ description, quantity, unit, unit_price }] }` |
| `PUT /api/admin/billing/:id` | cto, admin | Edit a draft (sent documents are locked) |
| `DELETE /api/admin/billing/:id` | cto, admin | Delete a draft |
| `POST /api/admin/billing/:id/send` | cto, admin | Number it, mark sent, email the client with the PDF attached |
| `GET /api/admin/billing/:id/pdf` | all staff | Download the document as a PDF |
| `POST /api/admin/billing/:id/decision` | cto, admin | Record a quotation decision taken by phone `{ decision: accepted \| declined }` |
| `POST /api/admin/billing/:id/convert` | cto, admin | New invoice draft from a quotation |
| `POST /api/admin/billing/:id/duplicate` | cto, admin | Copy as a new draft |
| `POST /api/admin/billing/:id/void` | cto, admin | Cancel a sent invoice |
| `POST /api/admin/billing/:id/payments` | cto, admin | Record a payment `{ amount, method, reference, paid_on, note }`; status becomes partially paid or paid |
| `DELETE /api/admin/billing/:id/payments/:paymentId` | cto, admin | Remove a payment record |

Statuses: quotations `draft, sent, accepted, declined` (shown as `expired` after the valid-until date);
invoices `draft, sent, partially_paid, paid, void` (shown as `overdue` after the due date).
