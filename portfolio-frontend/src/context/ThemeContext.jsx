import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'levi-blaque-theme'
const ThemeContext = createContext(null)

function getInitialPreference() {
  const preference = document.documentElement.dataset.themePreference
  return ['light', 'dark', 'system'].includes(preference) ? preference : 'system'
}

function resolveTheme(preference, systemDark) {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getInitialPreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => setSystemDark(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const theme = resolveTheme(preference, systemDark)
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themePreference = preference
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#171817' : '#f5f2ec',
    )
    try {
      window.localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // Theme still works for this visit when storage is unavailable.
    }
  }, [preference, systemDark])

  const value = useMemo(() => ({ preference, setPreference }), [preference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// The hook is colocated with its provider to keep this small context self-contained.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
