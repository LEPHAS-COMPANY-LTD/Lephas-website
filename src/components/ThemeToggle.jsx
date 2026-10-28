import { useState } from 'react'
import Icon from './Icon.jsx'
import { applyTheme, currentTheme, saveTheme } from '../lib/theme.js'

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => currentTheme())

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next, { animate: true })
    saveTheme(next)
    setTheme(next)
  }

  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button type="button" className={`btn btn-sm h-10 w-10 p-0 ${className}`} onClick={toggle} aria-label={label} title={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
    </button>
  )
}
