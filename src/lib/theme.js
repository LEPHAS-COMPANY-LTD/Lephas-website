const KEY = 'lephas.theme'

export function storedTheme() {
  try {
    const value = window.localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme, { animate = false } = {}) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 300)
  }
  root.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#2f3841' : '#e7eef5')
}

export function saveTheme(theme) {
  try {
    window.localStorage.setItem(KEY, theme)
  } catch {
    return
  }
}
