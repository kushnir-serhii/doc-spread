import type { ViewerHighlight } from '@/features/documents/viewer/viewer-highlights'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import { confidenceLevel } from '@/lib/mock/format'
import type { FieldValue } from '@/lib/mock/types'
import type { ProposalItem } from './use-proposal-review'

/** Confidence of a scalar value; a table has none of its own. */
export const confidenceOf = (value: FieldValue | undefined) =>
  value && value.type !== 'table' ? value.confidence : undefined

/** One box per non-rejected proposal that has an example on this sample's document. */
export const buildProposalHighlights = (
  items: readonly ProposalItem[],
  documentId: string,
  values: Record<string, FieldValue> | undefined,
  locale?: string,
): ViewerHighlight[] =>
  items.flatMap(({ field, status }): ViewerHighlight[] => {
    const example = field.examples.find((e) => e.documentId === documentId)
    if (status === 'rejected' || !example) return []
    const value = values?.[field.id]
    const confidence = confidenceOf(value)
    return [
      {
        id: field.id,
        page: example.page,
        bbox: example.bbox,
        tone: confidence !== undefined && confidenceLevel(confidence) !== 'high' ? 'low-confidence' : 'normal',
        label: value ? `${field.label}: ${formatFieldValue(value, locale)}` : field.label,
      },
    ]
  })
