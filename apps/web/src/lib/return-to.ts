/** A `returnTo` is followed only when it is an internal path: starts with a single `/`. */
export const safeReturnTo = (raw: string | null): string | null => {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  return raw
}

const BASE = 'https://internal.invalid'

/** Appends an id to a comma-separated query param of an internal path, keeping the other params. */
export const appendToParam = (path: string, key: string, id: string): string => {
  const url = new URL(path, BASE)
  const ids = (url.searchParams.get(key) ?? '').split(',').filter(Boolean)
  if (!ids.includes(id)) ids.push(id)
  url.searchParams.set(key, ids.join(','))
  return `${url.pathname}${url.search}${url.hash}`
}
