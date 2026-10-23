import { useRef, useState } from 'react'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import type { Document, DocumentType } from '@/lib/mock/types'
import { ReviewForm } from './review-form'
import { ReviewViewerPane } from './review-viewer-pane'
import { useReviewHighlights } from './use-review-highlights'

interface ReviewWorkspaceProps {
  doc: Document
  type: DocumentType
}

/** Viewer and form side by side (stacked on small screens), tied together by focus ids. */
export const ReviewWorkspace = ({ doc, type }: ReviewWorkspaceProps) => {
  const viewerRef = useRef<DocumentViewerHandle>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const highlights = useReviewHighlights(doc, type)

  const focusField = (id: string) => {
    setFocusedId(id)
    // focus stays in the form: the viewer only scrolls
    viewerRef.current?.scrollToHighlight(id, { focus: false })
  }
  const focusFromBox = (id: string) => {
    setFocusedId(id)
    formRef.current?.querySelector<HTMLElement>(`[data-focus-id="${id}"]`)?.focus()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <ReviewViewerPane
        ref={viewerRef}
        doc={doc}
        highlights={highlights}
        activeHighlightId={hoveredId ?? focusedId}
        onHighlightClick={focusFromBox}
      />
      <ReviewForm ref={formRef} doc={doc} type={type} onFieldFocus={focusField} onFieldHover={setHoveredId} />
    </div>
  )
}
