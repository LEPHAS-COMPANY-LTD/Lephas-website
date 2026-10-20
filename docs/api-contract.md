# API contract

Owner: Backend lead. Reviewed by Frontend and QA before any endpoint is built.
Frontend builds against this document using mock data until the endpoints are live.

All responses are JSON. Errors always use `{ "error": "message" }` with the right status code
(400 invalid input, 401 not logged in, 404 not found, 429 too many requests, 500 server error).

## Endpoints

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | Health check (already implemented) |
| `POST /api/quotes` | Public | Submit a quote request |
| `GET /api/projects` | Public | List portfolio projects (`?featured=true` optional) |
| `GET /api/projects/[slug]` | Public | One project |
| `GET /api/admin/quotes` | Admin | List quotes (`?status=new` optional) |
| `PATCH /api/admin/quotes/[id]` | Admin | Change a quote's status |
| `POST /api/admin/projects` | Admin | Add a project |
| `PUT /api/admin/projects/[id]` | Admin | Edit a project |
| `DELETE /api/admin/projects/[id]` | Admin | Remove a project |

## Request and response examples

TODO (Backend): add one request and one response example per endpoint, including error cases.
