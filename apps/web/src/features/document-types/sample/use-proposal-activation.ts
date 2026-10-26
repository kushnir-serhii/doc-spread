import { useState, type RefObject } from 'react'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'

/**
 * The field whose box is highlighted (hover or focus) and scrolling the viewer to it.
 * Focus stays in the list (`focus: false`): moving between rows or typing a name must not lose the caret.
 */
export const useProposalActivation = (viewerRef: RefObject<DocumentViewerHandle | null>) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const activate = (id: string | null) => {
    setActiveId(id)
    if (id === null) return
    viewerRef.current?.scrollToHighlight(id, { focus: false })
  }

  return { activeId, activate }
}
