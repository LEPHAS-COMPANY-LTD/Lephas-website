const BASE_URL = '/api'

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields || {}
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { 'X-Lephas-Client': '1' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status, data.fields)
  }
  return data
}

const qs = (params) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const api = {
  site: (opts) => request('/site', opts),
  services: (opts) => request('/services', opts),
  team: (filters = {}, opts) => request(`/team${qs(filters)}`, opts),
  member: (slug, opts) => request(`/team/${encodeURIComponent(slug)}`, opts),
  projects: (filters = {}, opts) => request(`/projects${qs(filters)}`, opts),
  project: (slug, opts) => request(`/projects/${encodeURIComponent(slug)}`, opts),

  submitInquiry: (data) => request('/inquiries', { method: 'POST', body: data }),
  viewInquiry: (reference, token, opts) =>
    request(`/inquiries/${encodeURIComponent(reference)}${qs({ token })}`, opts),
  replyToInquiry: (reference, token, message) =>
    request(`/inquiries/${encodeURIComponent(reference)}/messages`, { method: 'POST', body: { token, message } }),
  viewDocument: (reference, id, token, opts) =>
    request(`/inquiries/${encodeURIComponent(reference)}/documents/${id}${qs({ token })}`, opts),
  respondToQuote: (reference, id, token, decision, note) =>
    request(`/inquiries/${encodeURIComponent(reference)}/documents/${id}/decision`, { method: 'POST', body: { token, decision, note } }),
  lookupInquiries: (email) => request('/inquiries/lookup', { method: 'POST', body: { email } }),

  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: (opts) => request('/auth/me', opts),
  changePassword: (current_password, new_password) =>
    request('/auth/password', { method: 'POST', body: { current_password, new_password } }),

  admin: {
    overview: (opts) => request('/admin/overview', opts),
    inquiries: (filters = {}, opts) => request(`/admin/inquiries${qs(filters)}`, opts),
    inquiry: (id, opts) => request(`/admin/inquiries/${id}`, opts),
    updateInquiry: (id, data) => request(`/admin/inquiries/${id}`, { method: 'PATCH', body: data }),
    replyInquiry: (id, data) => request(`/admin/inquiries/${id}/messages`, { method: 'POST', body: data }),
    deleteInquiry: (id) => request(`/admin/inquiries/${id}`, { method: 'DELETE' }),

    services: (opts) => request('/admin/services', opts),
    saveService: (id, data) =>
      id ? request(`/admin/services/${id}`, { method: 'PUT', body: data }) : request('/admin/services', { method: 'POST', body: data }),
    deleteService: (id) => request(`/admin/services/${id}`, { method: 'DELETE' }),

    projects: (opts) => request('/admin/projects', opts),
    saveProject: (id, data) =>
      id ? request(`/admin/projects/${id}`, { method: 'PUT', body: data }) : request('/admin/projects', { method: 'POST', body: data }),
    deleteProject: (id) => request(`/admin/projects/${id}`, { method: 'DELETE' }),
    memberOptions: (opts) => request('/admin/members', opts),

    team: (opts) => request('/admin/team', opts),
    saveMember: (id, data) =>
      id ? request(`/admin/team/${id}`, { method: 'PUT', body: data }) : request('/admin/team', { method: 'POST', body: data }),
    deleteMember: (id) => request(`/admin/team/${id}`, { method: 'DELETE' }),

    uploadImage: (data, mime_type) => request('/admin/media', { method: 'POST', body: { data, mime_type } }),

    users: (opts) => request('/admin/users', opts),
    createUser: (data) => request('/admin/users', { method: 'POST', body: data }),
    updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PATCH', body: data }),

    billing: (filters = {}, opts) => request(`/admin/billing${qs(filters)}`, opts),
    document: (id, opts) => request(`/admin/billing/${id}`, opts),
    createDocument: (data) => request('/admin/billing', { method: 'POST', body: data }),
    updateDocument: (id, data) => request(`/admin/billing/${id}`, { method: 'PUT', body: data }),
    deleteDocument: (id) => request(`/admin/billing/${id}`, { method: 'DELETE' }),
    sendDocument: (id) => request(`/admin/billing/${id}/send`, { method: 'POST' }),
    duplicateDocument: (id) => request(`/admin/billing/${id}/duplicate`, { method: 'POST' }),
    convertToInvoice: (id) => request(`/admin/billing/${id}/convert`, { method: 'POST' }),
    quoteDecision: (id, decision) => request(`/admin/billing/${id}/decision`, { method: 'POST', body: { decision } }),
    voidInvoice: (id) => request(`/admin/billing/${id}/void`, { method: 'POST' }),
    addPayment: (id, data) => request(`/admin/billing/${id}/payments`, { method: 'POST', body: data }),
    deletePayment: (id, paymentId) => request(`/admin/billing/${id}/payments/${paymentId}`, { method: 'DELETE' }),

    settings: (opts) => request('/admin/settings', opts),
    saveSettings: (data) => request('/admin/settings', { method: 'PUT', body: data }),
  },
}
