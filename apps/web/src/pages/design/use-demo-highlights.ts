import { useMemo } from 'react'
import type { ViewerHighlight } from '@/features/documents/viewer/viewer-highlights'
import { useDocumentPages, useDocumentType } from '@/lib/api'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import { confidenceLevel } from '@/lib/mock/format'
import type { BBox, Document, ExtractedValue } from '@/lib/mock/types'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

const ACCEPTANCE_TEXT = '2026-10-14'
const SIDEWAYS_PAGE = 1

const unionBBox = (boxes: BBox[]): BBox => {
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.w))
  const bottom = Math.max(...boxes.map((b) => b.y + b.h))
  return { x, y, w: right - x, h: bottom - y }
}

/** Demo only: highlights from the extracted values that carry a source, plus one built from OCR tokens on the sideways invoice page. */
export const useDemoHighlights = (doc: Document | undefined): ViewerHighlight[] => {
  const type = useDocumentType(doc?.typeId ?? null, doc?.typeVersion ?? undefined).data
  const pages = useDocumentPages(doc?.id ?? null).data
  const locale = useFormatLocale()

  return useMemo(() => {
    if (!doc) return []
    const result: ViewerHighlight[] = []
    const add = (id: string, label: string, value: ExtractedValue) => {
      if (!value.source) return
      result.push({
        id,
        page: value.source.page,
        bbox: value.source.bbox,
        tone: confidenceLevel(value.confidence) === 'low' ? 'low-confidence' : 'normal',
        label,
      })
    }
    for (const field of type?.fields ?? []) {
      const value = doc.values[field.id]
      if (!value) continue
      if (value.type === 'table') {
        for (const [rowIndex, row] of value.rows.entries()) {
          for (const column of field.columns ?? []) {
            const cell = row.cells[column.id]
            if (cell) add(`${doc.id}:${row.id}:${column.id}`, `${field.label}, row ${rowIndex + 1}, ${column.label}: ${formatFieldValue(cell, locale)}`, cell)
          }
        }
      } else {
        add(`${doc.id}:${field.id}`, `${field.label}: ${formatFieldValue(value, locale)}`, value)
      }
    }
    // the sample invoice's sideways page has no sources: derive one from its OCR tokens
    const tokens = doc.id === 'doc-001' ? pages?.find((p) => p.index === SIDEWAYS_PAGE)?.tokens.filter((t) => t.text === ACCEPTANCE_TEXT) : undefined
    if (tokens?.length) {
      result.push({
        id: `${doc.id}:acceptance-date`,
        page: SIDEWAYS_PAGE,
        bbox: unionBBox(tokens.map((t) => t.bbox)),
        tone: 'normal',
        label: `Acceptance date: ${ACCEPTANCE_TEXT}`,
      })
    }
    return result
  }, [doc, type, pages, locale])
}
