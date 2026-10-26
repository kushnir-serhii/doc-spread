import { describeExpr } from '@/lib/fields/evaluate'
import type { FieldAction, FieldDef } from '@/lib/mock/types'
import { OP_SYMBOL } from '@/lib/fields/check-ops'

/** The name of an action in lists: a check's label, or "Computed → Field". */
export const actionTitle = (action: FieldAction, fields: readonly FieldDef[]) =>
  action.kind === 'check'
    ? action.label
    : `Computed → ${fields.find((f) => f.id === action.fieldId)?.label || 'deleted field'}`

/** The expression of an action as a readable line. */
export const actionLine = (action: FieldAction, fields: readonly FieldDef[]) =>
  action.kind === 'check'
    ? `${describeExpr(action.left, fields)} ${OP_SYMBOL[action.op]} ${describeExpr(action.right, fields)}`
    : describeExpr(action.expr, fields)
