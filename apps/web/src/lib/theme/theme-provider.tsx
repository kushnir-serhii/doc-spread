import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, type Theme } from './theme-context'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // storage unavailable — fall back to system
  }
  return 'system'
}

function subscribeSystem(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

const getSystemDark = () => window.matchMedia(DARK_QUERY).matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const systemDark = useSyncExternalStore(subscribeSystem, getSystemDark, () => false)
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme) => {
        setThemeState(next)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
          // ignore
        }
      },
    }),
    [theme, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
