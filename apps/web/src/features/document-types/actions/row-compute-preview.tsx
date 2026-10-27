import { computeRowValues } from '@/lib/fields/evaluate-rows'
import { describeFailure } from '@/lib/fields/describe-failure'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { Document, FieldAction, FieldDef, RowComputeAction } from '@/lib/mock/types'
import { PreviewBox } from './preview-box'
import { PreviewRowList } from './preview-row-list'
import { MAX_PREVIEW_ROWS, rowsText } from './row-count-text'

interface RowComputePreviewProps {
  action: RowComputeAction
  document: Document
  fields: FieldDef[]
  /** the draft's actions with `action` in place of its saved version */
  actions: FieldAction[]
}

/** A computed column on the sample document: the first computed values, and the rows that can't be computed. */
export const RowComputePreview = ({ action, document, fields, actions }: RowComputePreviewProps) => {
  const value = document.values[action.tableFieldId]
  const rows = value?.type === 'table' ? value.rows : []
  if (rows.length === 0) {
    return (
      <PreviewBox tone="neutral" title="No rows to compute">
        This document’s table has no rows.
      </PreviewBox>
    )
  }
  const outcomes = computeRowValues({ fields, actions }, document.values)[action.tableFieldId]
  // a failure names top-level fields and columns of the table
  const named: FieldDef[] = [...fields, ...(fields.find((f) => f.id === action.tableFieldId)?.columns ?? [])]
  const results = rows.flatMap((row, index) => {
    const outcome = outcomes?.[row.id]?.[action.columnId]
    return outcome ? [{ row, index, outcome }] : []
  })
  const computed = results.flatMap(({ row, index, outcome }) =>
    outcome.ok ? [{ key: row.id, text: `Row ${index + 1}: ${formatFieldValue(outcome.value)}` }] : [],
  )
  const failed = results.flatMap(({ row, index, outcome }) =>
    outcome.ok
      ? []
      : [
          {
            key: row.id,
            text: `Row ${index + 1}: ${describeFailure(outcome.reason, [...outcome.fieldIds, ...outcome.columnIds], named)}`,
          },
        ],
  )

  if (failed.length === 0) {
    return (
      <PreviewBox tone="ok" title={`Computed in all ${rowsText(rows.length)}`}>
        <PreviewRowList lines={computed.slice(0, MAX_PREVIEW_ROWS)} more={computed.length - MAX_PREVIEW_ROWS} />
      </PreviewBox>
    )
  }
  return (
    <PreviewBox tone="neutral" title={`Can’t compute ${failed.length} of ${rowsText(rows.length)}`}>
      <PreviewRowList lines={failed.slice(0, MAX_PREVIEW_ROWS)} more={failed.length - MAX_PREVIEW_ROWS} />
      {computed.length > 0 && (
        <div className="mt-2">
          <p className="text-xs">First computed values:</p>
          <PreviewRowList lines={computed.slice(0, MAX_PREVIEW_ROWS)} more={0} />
        </div>
      )}
    </PreviewBox>
  )
}
