import { allowedOps } from '@/lib/fields/evaluate'
import { getRowComputeActions } from '@/lib/fields/computed-fields'
import { exprTypeOfField } from '@/lib/fields/functions'
import type { ColumnDef, CompareOp, FieldAction, FieldDef } from '@/lib/mock/types'
import { OP_SYMBOL } from '@/lib/fields/check-ops'
import { nodeCellColumnIds, type ExprNode } from './expr-node'
import { exprProblems } from './expr-problems'
import { ANY_SCALAR, scalarTypeOf } from './expr-typing'
import { findCycle } from './find-cycle'
import { buildRowScope } from './row-scope'

const label = (item: Pick<FieldDef, 'label'> | undefined, fallback: string) => item?.label.trim() || fallback

/** The problem with the table a row action belongs to, or null when it is there. */
const tableProblem = (fields: readonly FieldDef[], tableFieldId: string): string | null => {
  const table = fields.find((f) => f.id === tableFieldId)
  if (!table) return 'The table of this row action was deleted.'
  if (table.type !== 'table') return `“${label(table, 'Untitled field')}” is no longer a table.`
  return null
}

interface RowCheckParts {
  id: string
  tableFieldId: string
  left: ExprNode
  op: CompareOp
  right: ExprNode
}

/** A row check is valid like a check, with the cells of its table readable and computed fields not. */
export const rowCheckProblems = (
  { id, tableFieldId, left, op, right }: RowCheckParts,
  fields: readonly FieldDef[],
  actions: readonly FieldAction[],
): string[] => {
  const missing = tableProblem(fields, tableFieldId)
  if (missing) return [missing]
  const row = buildRowScope(tableFieldId, actions, id)
  const leftType = scalarTypeOf(left, fields)
  return [
    ...new Set([
      ...exprProblems(left, fields, ANY_SCALAR, row),
      ...exprProblems(right, fields, leftType ? [leftType] : ANY_SCALAR, row),
      ...(leftType && !allowedOps(leftType).includes(op)
        ? [`“${OP_SYMBOL[op]}” can’t be used to compare ${leftType} values.`]
        : []),
    ]),
  ]
}

interface RowComputeParts {
  id: string
  tableFieldId: string
  /** '' = not chosen yet */
  columnId: string
  expr: ExprNode
}

const describeColumnCycle = (ids: readonly string[], columns: readonly ColumnDef[]) =>
  ids.map((id) => label(columns.find((c) => c.id === id), 'Untitled column')).join(' → ')

/** A computed column: its type must equal the expression's, it may be computed once, and columns can't depend on each other in a circle. */
export const rowComputeProblems = (
  { id, tableFieldId, columnId, expr }: RowComputeParts,
  fields: readonly FieldDef[],
  actions: readonly FieldAction[],
): string[] => {
  const missing = tableProblem(fields, tableFieldId)
  if (missing) return [missing]
  const columns = fields.find((f) => f.id === tableFieldId)?.columns ?? []
  if (columnId === '') return ['Pick the column to compute.']
  const target = columns.find((c) => c.id === columnId)
  if (!target) return ['The computed column was deleted.']
  const name = `“${label(target, 'Untitled column')}”`
  const type = exprTypeOfField(target.type)
  if (type === null) return [`${name} can’t be computed.`]

  const problems = exprProblems(expr, fields, [type], buildRowScope(tableFieldId, actions, id, columnId))
  const others = actions.filter((a) => a.id !== id)
  if (getRowComputeActions({ actions: others }).get(tableFieldId)?.has(columnId)) {
    problems.push(`${name} is already computed by another action.`)
  }
  const deps = new Map<string, readonly string[]>()
  for (const [computedId, action] of getRowComputeActions({ actions: others }).get(tableFieldId) ?? []) {
    deps.set(computedId, nodeCellColumnIds(action.expr))
  }
  deps.set(columnId, nodeCellColumnIds(expr))
  const cycle = findCycle(deps, columnId)
  if (cycle) {
    problems.push(
      cycle.length === 2
        ? `${name} can’t use itself: ${describeColumnCycle(cycle, columns)}.`
        : `Columns can’t depend on each other in a circle: ${describeColumnCycle(cycle, columns)}.`,
    )
  }
  return [...new Set(problems)]
}
