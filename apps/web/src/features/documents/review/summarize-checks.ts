import { describeCheckError, describeCheckSides } from '@/lib/fields/describe-check-outcome'
import { collectFieldIds, type CheckOutcome } from '@/lib/fields/evaluate'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import type { DocumentType } from '@/lib/mock/types'

export interface CheckSummary {
  /** failed checks and checks that can't be evaluated: what the list above the form shows */
  listed: ValidationIssue[]
  /** failed blocking checks: they join the problems that stop Approve */
  blocking: ValidationIssue[]
  /** failed warnings and every check that can't be evaluated: Approve asks to confirm them */
  warnings: ValidationIssue[]
  /** fields read by a failed check */
  involvedFieldIds: ReadonlySet<string>
}

/** Sorts the outcomes of `runChecks` into what Review shows and what Approve needs. Passed checks are dropped. */
export const summarizeChecks = (
  type: Pick<DocumentType, 'fields'>,
  outcomes: readonly CheckOutcome[],
  locale?: string,
): CheckSummary => {
  const listed: ValidationIssue[] = []
  const blocking: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const involvedFieldIds = new Set<string>()
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
  return { listed, blocking, warnings, involvedFieldIds }
}
