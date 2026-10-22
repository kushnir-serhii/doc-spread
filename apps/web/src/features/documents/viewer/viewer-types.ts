import type { BBox, Document, Token } from '@/lib/mock/types'

export type ViewerFile = Document['file']

/** fit: page width = container width; scale: 1 = the page's own width in CSS px */
export type ViewerZoom = { mode: 'fit' } | { mode: 'scale'; value: number }

export type ViewerMode = 'view' | 'select-words' | 'select-region'

/** What onSelect delivers: always in page coordinates (as delivered, before any view rotation). */
export interface ViewerSelection {
  /** 0-based DocumentPage.index */
  page: number
  bbox: BBox
  /** in reading order */
  tokens: Token[]
  /** token texts joined with spaces ('' for an empty region) */
  text: string
}
