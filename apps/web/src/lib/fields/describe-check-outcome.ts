import type { CheckOutcome } from './evaluate'
import { describeExpr } from './evaluate'
import { NEGATED_OP_SYMBOL, OP_SYMBOL } from './check-ops'
import { describeFailure } from './describe-failure'
import { formatEvalValue } from './format-eval-value'
import type { FieldDef } from '@/lib/mock/types'

/** "Gross $1,230.00 ≠ Net + VAT $1,229.00": both sides with their values. A failed check reads with the negated operator. */
export const describeCheckSides = (
  outcome: Extract<CheckOutcome, { status: 'passed' | 'failed' }>,
  fields: readonly FieldDef[],
): string => {
  const { check } = outcome
  const symbols = outcome.status === 'passed' ? OP_SYMBOL : NEGATED_OP_SYMBOL
  const left = `${describeExpr(check.left, fields)} ${formatEvalValue(outcome.left)}`
  const right = `${describeExpr(check.right, fields)} ${formatEvalValue(outcome.right)}`
  return `${left} ${symbols[check.op]} ${right}`
}

/** Why a check could not be evaluated ("VAT total is empty."). */
export const describeCheckError = (
  outcome: Extract<CheckOutcome, { status: 'error' }>,
  fields: readonly FieldDef[],
): string =>
  describeFailure(outcome.reason, outcome.reason === 'missing_value' ? outcome.emptyFieldIds : outcome.fieldIds, fields)
