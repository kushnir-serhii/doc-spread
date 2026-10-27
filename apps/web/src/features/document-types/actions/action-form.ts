import { allowedOps, supportsTolerance } from '@/lib/fields/evaluate'
import type { ExprType } from '@/lib/fields/functions'
import type { CheckAction, CompareOp, FieldAction, FieldDef } from '@/lib/mock/types'
import { checkProblems, computeProblems } from './action-problems'
import { DOCUMENT_SCOPE, fitsScope, type ActionScope } from './action-scope'
import { OP_SYMBOL } from '@/lib/fields/check-ops'
import { describeNode, EMPTY_NODE, toExpr, type ExprNode } from './expr-node'
import { scalarTypeOf } from './expr-typing'
import { rowCheckProblems, rowComputeProblems } from './row-action-problems'

export type Severity = CheckAction['severity']

/** The kinds the dialog starts from; the scope decides whether the result is a row action. */
export type NewActionKind = 'check' | 'compute'

/** The state of the action dialog: expressions may still have empty slots, the tolerance is the typed text. */
export interface CheckForm {
  kind: 'check'
  id: string
  scope: ActionScope
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
  scope: ActionScope
  /** the target field of a document scope; '' = not chosen yet */
  fieldId: string
  /** the target column of a row scope; '' = not chosen yet */
  columnId: string
  expr: ExprNode
}

export type ActionForm = CheckForm | ComputeForm

/** What the dialog is open for; null = closed. */
export type ActionEditorTarget = { mode: 'new'; kind: NewActionKind } | { mode: 'edit'; id: string }

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

export const newForm = (kind: NewActionKind): ActionForm =>
  kind === 'check'
    ? {
        kind,
        id: crypto.randomUUID(),
        scope: DOCUMENT_SCOPE,
        label: '',
        labelTouched: false,
        left: EMPTY_NODE,
        op: 'eq',
        right: EMPTY_NODE,
        tolerance: '',
        severity: 'warning',
      }
    : { kind, id: crypto.randomUUID(), scope: DOCUMENT_SCOPE, fieldId: '', columnId: '', expr: EMPTY_NODE }

export const formFromAction = (action: FieldAction, fields: readonly FieldDef[]): ActionForm => {
  switch (action.kind) {
    case 'compute':
      return { kind: 'compute', id: action.id, scope: DOCUMENT_SCOPE, fieldId: action.fieldId, columnId: '', expr: action.expr }
    case 'row_compute':
      return {
        kind: 'compute',
        id: action.id,
        scope: { kind: 'row', tableFieldId: action.tableFieldId },
        fieldId: '',
        columnId: action.columnId,
        expr: action.expr,
      }
    case 'check':
    case 'row_check':
      return {
        kind: 'check',
        id: action.id,
        scope: action.kind === 'row_check' ? { kind: 'row', tableFieldId: action.tableFieldId } : DOCUMENT_SCOPE,
        label: action.label,
        labelTouched: action.label !== generatedLabel(action, fields),
        left: action.left,
        op: action.op,
        right: action.right,
        tolerance: toleranceText(action.tolerance),
        severity: action.severity,
      }
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${String(unreachable)}`)
    }
  }
}

/**
 * Changes what the action applies to. A computed target and its expression are cleared (they had to fit the
 * old scope); a check keeps the sides that still make sense.
 */
export const withScope = (
  form: ActionForm,
  scope: ActionScope,
  fields: readonly FieldDef[],
  actions: readonly FieldAction[],
): ActionForm => {
  if (form.kind === 'compute') return { ...form, scope, fieldId: '', columnId: '', expr: EMPTY_NODE }
  const keep = (node: ExprNode) => (fitsScope(node, scope, fields, actions, form.id) ? node : EMPTY_NODE)
  return { ...form, scope, left: keep(form.left), right: keep(form.right) }
}

/** The operator that is used: the chosen one if the left side allows it, else `eq`. */
export const effectiveOp = (op: CompareOp, leftType: ExprType | null): CompareOp =>
  leftType === null || allowedOps(leftType).includes(op) ? op : 'eq'

export const shownLabel = (form: CheckForm, fields: readonly FieldDef[]) =>
  form.labelTouched ? form.label : generatedLabel(form, fields)

/** Everything that stops the action from being saved. Empty = valid. */
export const formProblems = (form: ActionForm, fields: readonly FieldDef[], actions: readonly FieldAction[]): string[] => {
  const { scope } = form
  if (form.kind === 'compute') {
    return scope.kind === 'row'
      ? rowComputeProblems({ ...form, tableFieldId: scope.tableFieldId }, fields, actions)
      : computeProblems(form, fields, actions)
  }
  const leftType = scalarTypeOf(form.left, fields)
  const parts = { ...form, op: effectiveOp(form.op, leftType) }
  return [
    ...(scope.kind === 'row'
      ? rowCheckProblems({ ...parts, tableFieldId: scope.tableFieldId }, fields, actions)
      : checkProblems(parts, fields)),
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
  const { scope } = form
  if (form.kind === 'compute') {
    const expr = toExpr(form.expr)
    if (!expr) return null
    return scope.kind === 'row'
      ? { kind: 'row_compute', id: form.id, tableFieldId: scope.tableFieldId, columnId: form.columnId, expr }
      : { kind: 'compute', id: form.id, fieldId: form.fieldId, expr }
  }
  const [left, right] = [toExpr(form.left), toExpr(form.right)]
  if (!left || !right) return null
  const leftType = scalarTypeOf(form.left, fields)
  const tolerance = leftType && supportsTolerance(leftType) ? parseTolerance(form.tolerance) : undefined
  const common = {
    id: form.id,
    label: shownLabel(form, fields).trim(),
    left,
    op: effectiveOp(form.op, leftType),
    right,
    ...(typeof tolerance === 'number' && { tolerance }),
    severity: form.severity,
  }
  return scope.kind === 'row'
    ? { kind: 'row_check', tableFieldId: scope.tableFieldId, ...common }
    : { kind: 'check', ...common }
}
