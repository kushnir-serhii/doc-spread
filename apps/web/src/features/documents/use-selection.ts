import { useState } from 'react'
import type { Document } from '@/lib/mock/types'

export interface Selection {
  /** selected ids that are still in the current list */
  ids: string[]
  /** none / some / all of the visible documents */
  state: 'none' | 'some' | 'all'
  has: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
}

/** Selection is kept as raw ids; rows that left the list (filter, approve) are ignored while computing. */
export const useSelection = (documents: Document[], initialIds: readonly string[] = []): Selection => {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initialIds))
  const ids = documents.filter((doc) => selected.has(doc.id)).map((doc) => doc.id)
  const state = ids.length === 0 ? 'none' : ids.length === documents.length ? 'all' : 'some'

  return {
    ids,
    state,
    has: (id) => selected.has(id),
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    toggleAll: () => setSelected(state === 'all' ? new Set() : new Set(documents.map((doc) => doc.id))),
    clear: () => setSelected(new Set()),
  }
}
