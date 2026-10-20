// All calls to the backend go through this file, so switching from mock data
// to the real API is a change in one place. Endpoints are listed in docs/api-contract.md.

const BASE_URL = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }

  return data
}

export function checkHealth() {
  return request('/health')
}

// TODO (Frontend + Backend): add getProjects, getProject, submitQuote and the admin calls.
