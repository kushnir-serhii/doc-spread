import { getSupabase } from './client'

const BUCKET = 'documents'
const LIFETIME_S = 3600
/** A cached URL is reused while it has at least this long to live. */
const MIN_REMAINING_MS = 10 * 60 * 1000

const cache = new Map<string, { url: string; expiresAt: number }>()

/**
 * A signed URL (1 h) of a stored file of the caller's company (RLS). Reused until it is close to expiring, so a
 * refetched document keeps the same URL and the viewer doesn't reload the file.
 */
export const getSignedFileUrl = async (storagePath: string): Promise<string> => {
  const cached = cache.get(storagePath)
  if (cached && cached.expiresAt - Date.now() > MIN_REMAINING_MS) return cached.url
  const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(storagePath, LIFETIME_S)
  if (error) throw new Error(`Couldn't open the file: ${error.message}`)
  cache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + LIFETIME_S * 1000 })
  return data.signedUrl
}
