import { describeCheckSides } from '@/lib/fields/describe-check-outcome'
import { describeFailure } from '@/lib/fields/describe-failure'
import type { RowCheckOutcome, RowCheckRowOutcome } from '@/lib/fields/evaluate-rows'
import type { FieldDef } from '@/lib/mock/types'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'
import { PreviewBox } from './preview-box'
import { PreviewRowList } from './preview-row-list'
import { MAX_PREVIEW_ROWS, rowsText } from './row-count-text'

interface RowCheckPreviewProps {
  outcome: RowCheckOutcome
  fields: FieldDef[]
}

/** A row check on the sample document: "Fails in 2 of 64 rows", then the first failing rows with both sides. */
export const RowCheckPreview = ({ outcome, fields }: RowCheckPreviewProps) => {
  const locale = useFormatLocale()
  const { check, rowCount, rows } = outcome
  const failed = rows.filter((row) => row.status === 'failed')
  const errors = rows.filter((row) => row.status === 'error')
  // a failure names top-level fields and columns of the table
  const named: FieldDef[] = [...fields, ...(fields.find((f) => f.id === check.tableFieldId)?.columns ?? [])]

  const line = (row: RowCheckRowOutcome) => {
    const prefix = `Row ${row.index + 1}: `
    if (row.status === 'error') {
      const ids =
        row.reason === 'missing_value' ? [...row.emptyFieldIds, ...row.emptyColumnIds] : [...row.fieldIds, ...row.columnIds]
      return { key: row.rowId, text: prefix + describeFailure(row.reason, ids, named) }
    }
    const sides = describeCheckSides(
      { status: row.status, check: { ...check, kind: 'check' }, left: row.left, right: row.right },
      fields,
      locale,
    )
    return { key: row.rowId, text: prefix + sides }
  }

  if (rowCount === 0) {
    return (
      <PreviewBox tone="neutral" title="No rows to check">
        This document’s table has no rows.
      </PreviewBox>
    )
  }
  if (failed.length > 0) {
    return (
      <PreviewBox tone="bad" title={`Fails in ${failed.length} of ${rowsText(rowCount)}`}>
        <PreviewRowList lines={failed.slice(0, MAX_PREVIEW_ROWS).map(line)} more={failed.length - MAX_PREVIEW_ROWS} />
        {errors.length > 0 && <p className="mt-1 text-xs">{rowsText(errors.length)} can’t be checked.</p>}
      </PreviewBox>
    )
  }
  if (errors.length > 0) {
    return (
      <PreviewBox tone="neutral" title={`Can’t check ${errors.length} of ${rowsText(rowCount)}`}>
        <PreviewRowList lines={errors.slice(0, MAX_PREVIEW_ROWS).map(line)} more={errors.length - MAX_PREVIEW_ROWS} />
      </PreviewBox>
    )
  }
  if (rows.length === 0) {
    return (
      <PreviewBox tone="neutral" title="Nothing to check">
        Every row is empty in the cells this check reads.
      </PreviewBox>
    )
  }
  const skipped = rowCount - rows.length
  return (
    <PreviewBox
      tone="ok"
      title={skipped === 0 ? `Passes in all ${rowsText(rowCount)}` : `Passes in ${rows.length} of ${rowsText(rowCount)}`}
    >
      {skipped > 0 ? `${rowsText(skipped)} skipped: every cell the check reads is empty.` : ''}
    </PreviewBox>
  )
}
