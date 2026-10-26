import type { FieldDef } from '@/lib/mock/types'
import type { EvalFailureReason } from './functions'

const labelOf = (fields: readonly FieldDef[], id: string) =>
  fields.find((f) => f.id === id)?.label.trim() || 'A deleted field'

const joinLabels = (labels: string[]) =>
  labels.length <= 2 ? labels.join(' and ') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`

/** Why an expression could not be evaluated, in words ("VAT total is empty."). `fieldIds` are the fields involved. */
export const describeFailure = (
  reason: EvalFailureReason | 'cycle',
  fieldIds: readonly string[],
  fields: readonly FieldDef[],
): string => {
  const labels = fieldIds.map((id) => labelOf(fields, id))
  switch (reason) {
    case 'missing_value':
      return labels.length === 0
        ? 'A value is missing.'
        : `${joinLabels(labels)} ${labels.length === 1 ? 'is' : 'are'} empty.`
    case 'currency_mismatch':
      return 'The amounts are in different currencies, or no currency is known.'
    case 'type_mismatch':
      return 'The values don’t fit together: a field was deleted or its type changed.'
    case 'division_by_zero':
      return 'Division by zero.'
    case 'cycle':
      return `Fields depend on each other: ${[...labels, labels[0]].join(' → ')}.`
    default: {
      const unreachable: never = reason
      throw new Error(`Unknown reason: ${String(unreachable)}`)
    }
  }
}
