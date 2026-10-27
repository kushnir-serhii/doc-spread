import type { Expr, FieldAction } from '@/lib/mock/types'

/** The expression with every field, column and cell id passed through `mapId`. */
export const mapExprIds = (expr: Expr, mapId: (id: string) => string): Expr => {
  switch (expr.kind) {
    case 'field':
      return { ...expr, fieldId: mapId(expr.fieldId) }
    case 'column':
      return { ...expr, fieldId: mapId(expr.fieldId), columnId: mapId(expr.columnId) }
    case 'cell':
      return { ...expr, columnId: mapId(expr.columnId) }
    case 'const':
      return expr
    case 'call':
      return { ...expr, args: expr.args.map((arg) => mapExprIds(arg, mapId)) }
    default: {
      const unreachable: never = expr
      throw new Error(`Unknown expression: ${String(unreachable)}`)
    }
  }
}

/** The action with its own id, its target field / table / column and every id inside its expressions passed through `mapId`. */
export const mapActionIds = (action: FieldAction, mapId: (id: string) => string): FieldAction => {
  switch (action.kind) {
    case 'check':
      return { ...action, id: mapId(action.id), left: mapExprIds(action.left, mapId), right: mapExprIds(action.right, mapId) }
    case 'compute':
      return { ...action, id: mapId(action.id), fieldId: mapId(action.fieldId), expr: mapExprIds(action.expr, mapId) }
    case 'row_check':
      return {
        ...action,
        id: mapId(action.id),
        tableFieldId: mapId(action.tableFieldId),
        left: mapExprIds(action.left, mapId),
        right: mapExprIds(action.right, mapId),
      }
    case 'row_compute':
      return {
        ...action,
        id: mapId(action.id),
        tableFieldId: mapId(action.tableFieldId),
        columnId: mapId(action.columnId),
        expr: mapExprIds(action.expr, mapId),
      }
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${String(unreachable)}`)
    }
  }
}
