import { useSyncExternalStore } from 'react'

/** Tracks a CSS media query, e.g. `useMediaQuery('(min-width: 1024px)')`. */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
