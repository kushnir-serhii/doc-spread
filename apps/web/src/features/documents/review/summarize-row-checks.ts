import { describeFailure } from '@/lib/fields/describe-failure'
import { collectCellColumnIds, collectFieldIds } from '@/lib/fields/evaluate'
import type { RowCheckOutcome, RowCheckRowOutcome } from '@/lib/fields/evaluate-rows'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import type { FieldDef } from '@/lib/mock/types'
import type { RowFailures } from '@/features/documents/fields/row-failures'

/** How many row numbers an entry names before "and N more". */
const MAX_LISTED_ROWS = 5

export interface RowCheckEntry {
  issue: ValidationIssue
  /** the entry is a failure (not a "can't check"), and a blocking one if the check is */
  failed: boolean
  blocking: boolean
  /** table field → rows it fails in */
  failures: RowFailures
  tableFieldId: string
  /** top-level fields the check reads */
  fieldIds: string[]
}

const rowNumbers = (rows: readonly RowCheckRowOutcome[]) => {
  const numbers = rows.map((row) => String(row.index + 1))
  const shown = numbers.slice(0, MAX_LISTED_ROWS).join(', ')
  const more = numbers.length - MAX_LISTED_ROWS
  return more > 0 ? `${shown} and ${more} more` : shown
}

const rowsLabel = (rows: readonly RowCheckRowOutcome[]) => `${rows.length === 1 ? 'row' : 'rows'} ${rowNumbers(rows)}`

/** The entries of one row check: one if it fails, one if it can’t be checked, per check and not per row. Empty when it is fine. */
export const summarizeRowCheck = (outcome: RowCheckOutcome, fields: readonly FieldDef[]): RowCheckEntry[] => {
  const { check, rowCount, rows } = outcome
  const named = [...fields, ...(fields.find((f) => f.id === check.tableFieldId)?.columns ?? [])]
  const fieldIds = [...new Set([...collectFieldIds(check.left), ...collectFieldIds(check.right)])]
  const failedRows = rows.filter((row) => row.status === 'failed')
  const errorRows = rows.filter((row) => row.status === 'error')
  const entries: RowCheckEntry[] = []
  const base = { tableFieldId: check.tableFieldId, fieldIds }

  if (failedRows.length > 0) {
    const columnIds = [...new Set([...collectCellColumnIds(check.left), ...collectCellColumnIds(check.right)])]
    const failures = new Map(failedRows.map((row) => [row.rowId, new Set(columnIds)]))
    const blocking = check.severity === 'blocking'
    entries.push({
      ...base,
      failed: true,
      blocking,
      failures,
      issue: {
        fieldId: check.tableFieldId,
        label: check.label,
        reason: `Fails in ${rowsLabel(failedRows)} (${failedRows.length} of ${rowCount})`,
        cell: columnIds[0] ? { rowId: failedRows[0].rowId, columnId: columnIds[0] } : undefined,
      },
    })
  }
  if (errorRows.length > 0) {
    // rows that can't be checked for the same reason are named together
    const groups = new Map<string, RowCheckRowOutcome[]>()
    for (const row of errorRows) {
      if (row.status !== 'error') continue
      const ids = row.reason === 'missing_value' ? [...row.emptyFieldIds, ...row.emptyColumnIds] : [...row.fieldIds, ...row.columnIds]
      const text = describeFailure(row.reason, ids, named)
      groups.set(text, [...(groups.get(text) ?? []), row])
    }
    const first = errorRows[0]
    const emptyColumn = first.status === 'error' ? first.emptyColumnIds[0] : undefined
    entries.push({
      ...base,
      failed: false,
      blocking: false,
      failures: new Map(),
      issue: {
        fieldId: check.tableFieldId,
        label: `Can’t check “${check.label}”`,
        reason: [...groups].map(([text, group]) => `${capitalize(rowsLabel(group))}: ${text}`).join(' '),
        cell: emptyColumn ? { rowId: first.rowId, columnId: emptyColumn } : undefined,
      },
    })
  }
  return entries
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
