// The evaluation order of spec 017, in one place: computed columns -> computed fields -> all checks.
// Document-level actions therefore see computed cells (`sum(Line items › Gross)`), and row actions can't
// form a cycle with computed fields (they may not read them).
import type { Document, DocumentType, FieldValue } from '@/lib/mock/types'
import { computeFieldValues, runCheck, type CheckOutcome, type ComputeOutcome } from './evaluate'
import { applyComputedCells, runRowChecks, type RowCheckOutcome } from './evaluate-rows'

type CheckType = Pick<DocumentType, 'fields' | 'actions'>

/** The values with computed cells and computed fields written in; those that can't be computed are removed. */
export const resolveValues = (type: CheckType, values: Record<string, FieldValue>): Record<string, FieldValue> => {
  const resolved = { ...applyComputedCells(type, values) }
  for (const [fieldId, outcome] of Object.entries(computeFieldValues(type, resolved))) {
    if (outcome.ok) resolved[fieldId] = outcome.value
    else delete resolved[fieldId]
  }
  return resolved
}

/**
 * The outcome per computed field. Computed columns are computed first, so a field like
 * `sum(Line items › Gross)` sees the computed cells. Stored values of computed fields are ignored.
 */
export const computeValues = (type: CheckType, values: Record<string, FieldValue>): Record<string, ComputeOutcome> =>
  computeFieldValues(type, applyComputedCells(type, values))

/**
 * Runs every document-level check of the type on the document. Computed columns and computed fields are
 * recomputed first and win over stored values, so a check sees their current values. A check that can't be
 * evaluated is an `error` (with its reason and the fields involved), never `failed`.
 */
export const runChecks = (type: CheckType, document: Pick<Document, 'values'>): CheckOutcome[] => {
  const ctx = { fields: type.fields, values: resolveValues(type, document.values) }
  return type.actions.flatMap((action) => (action.kind === 'check' ? [runCheck(action, ctx)] : []))
}

/** Runs every row check of the type: one outcome per check, with one entry per checked row. Same order as `runChecks`. */
export const runRowChecksOnDocument = (type: CheckType, document: Pick<Document, 'values'>): RowCheckOutcome[] =>
  runRowChecks(type, resolveValues(type, document.values))
