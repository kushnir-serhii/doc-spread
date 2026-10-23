import type { BBox } from '@/lib/mock/types'

/**
 * Two tones only: "active" is a state (activeHighlightId), not a property of the highlight,
 * so the same highlight can be active and low confidence at once.
 */
export type HighlightTone = 'normal' | 'low-confidence'

export interface ViewerHighlight {
  id: string
  /** 0-based DocumentPage.index */
  page: number
  /** normalized page coordinates (as delivered, before any view rotation) */
  bbox: BBox
  tone: HighlightTone
  /** accessible name: "Issue date: 12.03.2026" */
  label: string
}

export interface DocumentViewerHandle {
  /**
   * scroll the highlight to the centre of the view, even when its page is far away.
   * It also takes keyboard focus unless `focus` is false (use that when focus lives elsewhere, e.g. in a form field).
   */
  scrollToHighlight: (id: string, options?: { focus?: boolean }) => void
}
