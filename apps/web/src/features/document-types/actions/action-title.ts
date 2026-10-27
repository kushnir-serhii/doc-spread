import { describeExpr } from '@/lib/fields/evaluate'
import type { FieldAction, FieldDef } from '@/lib/mock/types'
import { OP_SYMBOL } from '@/lib/fields/check-ops'

const labelOf = (fields: readonly FieldDef[], id: string) => fields.find((f) => f.id === id)?.label || 'deleted field'

/** The name of an action in lists: a check's label, "Computed → Field", or "Computed → Table › Column" for a row action. */
export const actionTitle = (action: FieldAction, fields: readonly FieldDef[]): string => {
  switch (action.kind) {
    case 'check':
    case 'row_check':
      return action.label
    case 'compute':
      return `Computed → ${labelOf(fields, action.fieldId)}`
    case 'row_compute': {
      const column = fields.find((f) => f.id === action.tableFieldId)?.columns?.find((c) => c.id === action.columnId)
      return `Computed → ${labelOf(fields, action.tableFieldId)} › ${column?.label || 'deleted column'}`
    }
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${String(unreachable)}`)
    }
  }
}

/** The expression of an action as a readable line. */
export const actionLine = (action: FieldAction, fields: readonly FieldDef[]): string => {
  switch (action.kind) {
    case 'check':
    case 'row_check':
      return `${describeExpr(action.left, fields)} ${OP_SYMBOL[action.op]} ${describeExpr(action.right, fields)}`
    case 'compute':
    case 'row_compute':
      return describeExpr(action.expr, fields)
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${String(unreachable)}`)
    }
  }
}
