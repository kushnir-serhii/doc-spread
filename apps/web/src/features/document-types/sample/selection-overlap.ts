import type { BBox } from '@/lib/mock/types'
import type { ViewerSelection } from '@/features/documents/viewer/viewer-types'
import type { ProposalItem } from './use-proposal-review'

const intersects = (a: BBox, b: BBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** The first listed field (not rejected) whose box on this document overlaps the selection. */
export const findOverlappingItem = (
  items: readonly ProposalItem[],
  documentId: string,
  selection: ViewerSelection | null,
): ProposalItem | undefined =>
  selection === null
    ? undefined
    : items.find(
        ({ field, status }) =>
          status !== 'rejected' &&
          field.examples.some(
            (e) => e.documentId === documentId && e.page === selection.page && intersects(e.bbox, selection.bbox),
          ),
      )
