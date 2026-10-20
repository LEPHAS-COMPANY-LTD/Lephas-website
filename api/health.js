// Vercel serverless function: GET /api/health
// Every file in /api becomes an endpoint with the same path.
// Backend lead: copy this pattern for the real endpoints in docs/api-contract.md.
export default function handler(req, res) {
  res.status(200).json({ status: 'ok' })
}
