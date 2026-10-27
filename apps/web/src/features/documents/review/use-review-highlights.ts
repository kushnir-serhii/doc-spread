import { useMemo } from 'react'
import { cellFocusId, fieldFocusId } from '@/features/documents/fields/field-focus-ids'
import type { ViewerHighlight } from '@/features/documents/viewer/viewer-highlights'
import { isLowConfidence } from '@/lib/fields/confidence'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { DocumentType, ExtractedValue, FieldValue } from '@/lib/mock/types'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

/** One viewer box per value (of the draft) that carries a source (table cells included). Values without a source get no box. */
export const useReviewHighlights = (
  docId: string,
  values: Record<string, FieldValue>,
  type: DocumentType,
): ViewerHighlight[] => {
  const locale = useFormatLocale()
  return useMemo(() => {
    const result: ViewerHighlight[] = []
    const add = (id: string, label: string, value: ExtractedValue) => {
      if (!value.source) return
      result.push({
        id,
        page: value.source.page,
        bbox: value.source.bbox,
        tone: isLowConfidence(value.confidence) ? 'low-confidence' : 'normal',
        label,
      })
    }
    for (const field of type.fields) {
      const value = values[field.id]
      if (!value) continue
      const focusId = fieldFocusId(docId, field.id)
      if (value.type === 'table') {
        for (const [rowIndex, row] of value.rows.entries()) {
          for (const column of field.columns ?? []) {
            const cell = row.cells[column.id]
            if (!cell) continue
            const label = `${field.label}, row ${rowIndex + 1}, ${column.label}: ${formatFieldValue(cell, locale)}`
            add(cellFocusId(focusId, row.id, column.id), label, cell)
          }
        }
      } else {
        add(focusId, `${field.label}: ${formatFieldValue(value, locale)}`, value)
      }
    }
    return result
  }, [docId, values, type, locale])
}
