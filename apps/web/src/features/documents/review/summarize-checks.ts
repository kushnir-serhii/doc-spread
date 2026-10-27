import { describeCheckError, describeCheckSides } from '@/lib/fields/describe-check-outcome'
import { collectFieldIds, type CheckOutcome } from '@/lib/fields/evaluate'
import type { RowCheckOutcome } from '@/lib/fields/evaluate-rows'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import type { DocumentType } from '@/lib/mock/types'
import type { RowFailures } from '@/features/documents/fields/row-failures'
import { summarizeRowCheck } from './summarize-row-checks'

export interface CheckSummary {
  /** failed checks and checks that can't be evaluated: what the list above the form shows */
  listed: ValidationIssue[]
  /** failed blocking checks: they join the problems that stop Approve */
  blocking: ValidationIssue[]
  /** failed warnings and every check that can't be evaluated: Approve asks to confirm them */
  warnings: ValidationIssue[]
  /** fields read by a failed check (a table is not marked for a row check: its rows are) */
  involvedFieldIds: ReadonlySet<string>
  /** table field id → the rows a failed row check fails in */
  rowFailures: ReadonlyMap<string, RowFailures>
}

/**
 * Sorts the outcomes of `runChecks` and `runRowChecks` into what Review shows and what Approve needs.
 * Passed checks are dropped. A row check gives one entry per check, not per row.
 */
export const summarizeChecks = (
  type: Pick<DocumentType, 'fields'>,
  outcomes: readonly CheckOutcome[],
  rowOutcomes: readonly RowCheckOutcome[] = [],
  locale?: string,
): CheckSummary => {
  const listed: ValidationIssue[] = []
  const blocking: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const involvedFieldIds = new Set<string>()
  const rowFailures = new Map<string, Map<string, ReadonlySet<string>>>()
  for (const outcome of outcomes) {
    if (outcome.status === 'passed') continue
    const { check } = outcome
    if (outcome.status === 'error') {
      // never "failed", never blocking: it is a state of its own
      const issue = {
        fieldId: outcome.fieldIds[0] ?? '',
        label: `Can’t check “${check.label}”`,
        reason: describeCheckError(outcome, type.fields),
      }
      listed.push(issue)
      warnings.push(issue)
      continue
    }
    const ids = [...new Set([...collectFieldIds(check.left), ...collectFieldIds(check.right)])]
    for (const id of ids) involvedFieldIds.add(id)
    const sides = describeCheckSides(outcome, type.fields, locale)
    const issue = { fieldId: ids[0] ?? '', label: check.label, reason: sides }
    if (check.severity === 'blocking') {
      blocking.push(issue)
      listed.push({ ...issue, reason: `${sides}. Blocks Approve.` })
    } else {
      warnings.push(issue)
      listed.push(issue)
    }
  }
  for (const rowOutcome of rowOutcomes) {
    for (const entry of summarizeRowCheck(rowOutcome, type.fields)) {
      if (entry.failed) {
        for (const id of entry.fieldIds) if (id !== entry.tableFieldId) involvedFieldIds.add(id)
        const byRow = rowFailures.get(entry.tableFieldId) ?? new Map<string, ReadonlySet<string>>()
        for (const [rowId, columns] of entry.failures) byRow.set(rowId, new Set([...(byRow.get(rowId) ?? []), ...columns]))
        rowFailures.set(entry.tableFieldId, byRow)
      }
      if (entry.blocking) {
        blocking.push(entry.issue)
        listed.push({ ...entry.issue, reason: `${entry.issue.reason}. Blocks Approve.` })
      } else {
        warnings.push(entry.issue)
        listed.push(entry.issue)
      }
    }
  }
  return { listed, blocking, warnings, involvedFieldIds, rowFailures }
}
