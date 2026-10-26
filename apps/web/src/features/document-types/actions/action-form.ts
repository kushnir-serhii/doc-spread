import { allowedOps, supportsTolerance } from '@/lib/fields/evaluate'
import type { ExprType } from '@/lib/fields/functions'
import type { CheckAction, CompareOp, FieldAction, FieldDef } from '@/lib/mock/types'
import { checkProblems, computeProblems } from './action-problems'
import { OP_SYMBOL } from '@/lib/fields/check-ops'
import { describeNode, EMPTY_NODE, toExpr, type ExprNode } from './expr-node'
import { scalarTypeOf } from './expr-typing'

export type Severity = CheckAction['severity']

/** The state of the action dialog: expressions may still have empty slots, the tolerance is the typed text. */
export interface CheckForm {
  kind: 'check'
  id: string
  label: string
  /** the user edited the label; until then it follows the expression */
  labelTouched: boolean
  left: ExprNode
  op: CompareOp
  right: ExprNode
  tolerance: string
  severity: Severity
}

export interface ComputeForm {
  kind: 'compute'
  id: string
  /** '' = not chosen yet */
  fieldId: string
  expr: ExprNode
}

export type ActionForm = CheckForm | ComputeForm

/** What the dialog is open for; null = closed. */
export type ActionEditorTarget = { mode: 'new'; kind: FieldAction['kind'] } | { mode: 'edit'; id: string }

export const generatedLabel = (form: Pick<CheckForm, 'left' | 'op' | 'right'>, fields: readonly FieldDef[]) =>
  `${describeNode(form.left, fields)} ${OP_SYMBOL[form.op]} ${describeNode(form.right, fields)}`

/** The typed number as is (money is in major units of the document's currency). `'invalid'` when it isn't a number ≥ 0. */
export const parseTolerance = (text: string): number | undefined | 'invalid' => {
  if (text.trim() === '') return undefined
  const value = Number(text.trim().replace(',', '.'))
  if (!Number.isFinite(value) || value < 0) return 'invalid'
  return value
}

const toleranceText = (tolerance: number | undefined) => (tolerance === undefined ? '' : String(tolerance))

export const newForm = (kind: FieldAction['kind']): ActionForm =>
  kind === 'check'
    ? {
        kind,
        id: crypto.randomUUID(),
        label: '',
        labelTouched: false,
        left: EMPTY_NODE,
        op: 'eq',
        right: EMPTY_NODE,
        tolerance: '',
        severity: 'warning',
      }
    : { kind, id: crypto.randomUUID(), fieldId: '', expr: EMPTY_NODE }

export const formFromAction = (action: FieldAction, fields: readonly FieldDef[]): ActionForm => {
  if (action.kind === 'compute') return { kind: 'compute', id: action.id, fieldId: action.fieldId, expr: action.expr }
  return {
    kind: 'check',
    id: action.id,
    label: action.label,
    labelTouched: action.label !== generatedLabel(action, fields),
    left: action.left,
    op: action.op,
    right: action.right,
    tolerance: toleranceText(action.tolerance),
    severity: action.severity,
  }
}

/** The operator that is used: the chosen one if the left side allows it, else `eq`. */
export const effectiveOp = (op: CompareOp, leftType: ExprType | null): CompareOp =>
  leftType === null || allowedOps(leftType).includes(op) ? op : 'eq'

export const shownLabel = (form: CheckForm, fields: readonly FieldDef[]) =>
  form.labelTouched ? form.label : generatedLabel(form, fields)

/** Everything that stops the action from being saved. Empty = valid. */
export const formProblems = (form: ActionForm, fields: readonly FieldDef[], actions: readonly FieldAction[]): string[] => {
  if (form.kind === 'compute') return computeProblems(form, fields, actions)
  const leftType = scalarTypeOf(form.left, fields)
  return [
    ...checkProblems({ ...form, op: effectiveOp(form.op, leftType) }, fields),
    ...(shownLabel(form, fields).trim() === '' ? ['Give the check a label.'] : []),
    ...(supportsTolerance(leftType ?? 'text') && parseTolerance(form.tolerance) === 'invalid'
      ? ['The tolerance must be a number, 0 or more.']
      : []),
  ]
}

/** The finished action, or null while the form has problems. */
export const formToAction = (
  form: ActionForm,
  fields: readonly FieldDef[],
  actions: readonly FieldAction[],
): FieldAction | null => {
  if (formProblems(form, fields, actions).length > 0) return null
  if (form.kind === 'compute') {
    const expr = toExpr(form.expr)
    return expr ? { kind: 'compute', id: form.id, fieldId: form.fieldId, expr } : null
  }
  const [left, right] = [toExpr(form.left), toExpr(form.right)]
  if (!left || !right) return null
  const leftType = scalarTypeOf(form.left, fields)
  const tolerance = leftType && supportsTolerance(leftType) ? parseTolerance(form.tolerance) : undefined
  return {
    kind: 'check',
    id: form.id,
    label: shownLabel(form, fields).trim(),
    left,
    op: effectiveOp(form.op, leftType),
    right,
    ...(typeof tolerance === 'number' && { tolerance }),
    severity: form.severity,
  }
}
