const KEY = 'lephas.requests'

export function recentRequests() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value.filter((item) => item && item.reference && item.token) : []
  } catch {
    return []
  }
}

export function rememberRequest(entry) {
  try {
    const list = recentRequests().filter((item) => item.reference !== entry.reference)
    list.unshift({ ...entry, saved_at: new Date().toISOString() })
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)))
  } catch {
    return
  }
}

export function forgetRequest(reference) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(recentRequests().filter((item) => item.reference !== reference)))
  } catch {
    return
  }
}
