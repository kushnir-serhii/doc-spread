import { allowedOps } from '@/lib/fields/evaluate'
import { exprTypeOfField } from '@/lib/fields/functions'
import { getComputeActions } from '@/lib/fields/computed-fields'
import type { CompareOp, FieldAction, FieldDef } from '@/lib/mock/types'
import { OP_SYMBOL } from '@/lib/fields/check-ops'
import { nodeFieldIds, type ExprNode } from './expr-node'
import { exprProblems } from './expr-problems'
import { ANY_SCALAR, scalarTypeOf } from './expr-typing'

const labelOf = (fields: readonly FieldDef[], id: string) => fields.find((f) => f.id === id)?.label.trim() || 'Untitled field'

/** The field ids of a chain A → B → A, or null. `deps` maps a computed field to the fields its expression reads. */
export const findCycle = (deps: ReadonlyMap<string, readonly string[]>, start: string): string[] | null => {
  const visit = (id: string, path: string[]): string[] | null => {
    for (const next of deps.get(id) ?? []) {
      if (next === start) return [...path, start]
      if (!path.includes(next) && deps.has(next)) {
        const found = visit(next, [...path, next])
        if (found) return found
      }
    }
    return null
  }
  return visit(start, [start])
}

export const describeCycle = (ids: readonly string[], fields: readonly FieldDef[]) =>
  ids.map((id) => labelOf(fields, id)).join(' → ')

interface CheckParts {
  left: ExprNode
  op: CompareOp
  right: ExprNode
}

export const checkProblems = ({ left, op, right }: CheckParts, fields: readonly FieldDef[]): string[] => {
  const leftType = scalarTypeOf(left, fields)
  return [
    ...new Set([
      ...exprProblems(left, fields, ANY_SCALAR),
      ...exprProblems(right, fields, leftType ? [leftType] : ANY_SCALAR),
      ...(leftType && !allowedOps(leftType).includes(op)
        ? [`“${OP_SYMBOL[op]}” can’t be used to compare ${leftType} values.`]
        : []),
    ]),
  ]
}

interface ComputeParts {
  id: string
  /** '' = not chosen yet */
  fieldId: string
  expr: ExprNode
}

/** `actions`: every action of the draft (the one being checked may be among them; it is replaced by `parts`). */
export const computeProblems = (
  { id, fieldId, expr }: ComputeParts,
  fields: readonly FieldDef[],
  actions: readonly FieldAction[],
): string[] => {
  const target = fields.find((f) => f.id === fieldId)
  if (fieldId === '') return ['Pick the field to compute.']
  if (!target) return ['The computed field was deleted.']
  const type = exprTypeOfField(target.type)
  if (type === null) return [`“${labelOf(fields, fieldId)}” is a table and can’t be computed.`]

  const problems = exprProblems(expr, fields, [type])
  if (actions.some((a) => a.kind === 'compute' && a.fieldId === fieldId && a.id !== id)) {
    problems.push(`“${labelOf(fields, fieldId)}” is already computed by another action.`)
  }
  const deps = new Map<string, readonly string[]>()
  for (const [computedId, action] of getComputeActions({ actions: actions.filter((a) => a.id !== id) })) {
    deps.set(computedId, nodeFieldIds(action.expr))
  }
  deps.set(fieldId, nodeFieldIds(expr))
  const cycle = findCycle(deps, fieldId)
  if (cycle) {
    problems.push(
      cycle.length === 2
        ? `“${labelOf(fields, fieldId)}” can’t use itself: ${describeCycle(cycle, fields)}.`
        : `Fields can’t depend on each other in a circle: ${describeCycle(cycle, fields)}.`,
    )
  }
  return [...new Set(problems)]
}

/** The problems of a saved action against the current fields of the draft. */
export const actionProblems = (action: FieldAction, fields: readonly FieldDef[], actions: readonly FieldAction[]): string[] => {
  switch (action.kind) {
    case 'check':
      return checkProblems(action, fields)
    case 'compute':
      return computeProblems({ id: action.id, fieldId: action.fieldId, expr: action.expr }, fields, actions)
    case 'row_check':
    case 'row_compute':
      // validated with the row editor (spec 017 slice 2)
      return []
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${String(unreachable)}`)
    }
  }
}
