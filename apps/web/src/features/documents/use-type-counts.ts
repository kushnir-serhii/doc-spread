import { useDocuments } from '@/lib/api'
import type { TypeCounts } from './type-switcher'

/**
 * Counts come from one unfiltered list (shared cache entry with the All view),
 * so switching tabs never refetches them. Undefined until loaded.
 */
export const useTypeCounts = (): TypeCounts | undefined => {
  const { data } = useDocuments()
  if (!data) return undefined
  const needsReviewByType = new Map<string, number>()
  let unclassified = 0
  for (const doc of data) {
    if (doc.status === 'unclassified') unclassified += 1
    if (doc.status === 'needs_review' && doc.typeId) {
      needsReviewByType.set(doc.typeId, (needsReviewByType.get(doc.typeId) ?? 0) + 1)
    }
  }
  return { unclassified, needsReviewByType }
}
