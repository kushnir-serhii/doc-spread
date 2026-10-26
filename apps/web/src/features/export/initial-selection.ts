import type { Document } from '@/lib/mock/types'

/** ?ids= preselects the approved documents it names (others are ignored); without it, or with none matching, all are selected. */
export const initialSelection = (documents: Document[], idsParam: string | null): string[] => {
  const requested = new Set((idsParam ?? '').split(',').filter(Boolean))
  const matching = documents.filter((doc) => requested.has(doc.id)).map((doc) => doc.id)
  return matching.length > 0 ? matching : documents.map((doc) => doc.id)
}
