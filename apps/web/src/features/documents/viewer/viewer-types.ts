import type { Document } from '@/lib/mock/types'

export type ViewerFile = Document['file']

/** fit: page width = container width; scale: 1 = the page's own width in CSS px */
export type ViewerZoom = { mode: 'fit' } | { mode: 'scale'; value: number }
