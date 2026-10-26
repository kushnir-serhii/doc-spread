// Evaluates expressions, checks and computed fields (spec 016) through the function registry.
//
// Currency rule: a money constant has only an amount. All money in one call, or on both sides of a
// comparison, must share one currency (otherwise `currency_mismatch`), and a money constant takes
// the currency of the other money there. If nothing determines it, the result is `currency_mismatch`
// too (the currencies can't be reconciled); a currency is never assumed, and USD is never a silent default.
import type {
  AnyExtractedValue,
  CheckAction,
  CompareOp,
  CurrencyCode,
  Expr,
  FieldDef,
  FieldValue,
  FunctionId,
  Money,
  DocumentType,
  Document,
} from '@/lib/mock/types'
import { getComputeActions } from './computed-fields'
import { exprTypeOfField, fail, getFunction, ok, parseIsoDate, signatureFits } from './functions'
import type { EvalFailureReason, EvalResult, ExprType, TypeName } from './functions'

export type { EvalFailureReason, EvalResult } from './functions'

/** A computed value, tagged with its type. Money always has its currency here. */
export type EvalValue =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | { type: 'date'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'money'; value: Money }

export type ExprResult = EvalResult<EvalValue>

/** What an expression reads: the type's fields and the document's values (by field id). */
export interface EvalContext {
  fields: readonly FieldDef[]
  values: Record<string, FieldValue>
}

// ---------- internal values ----------
type Scalar =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | { type: 'date'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'money'; amount: number; currency: CurrencyCode | null }

type Node =
  | { kind: 'scalar'; scalar: Scalar }
  | { kind: 'empty'; type: ExprType }
  | { kind: 'list'; type: ExprType; items: Scalar[] }

const scalarNode = (scalar: Scalar): EvalResult<Node> => ok({ kind: 'scalar', scalar })

const fromExtracted = (value: AnyExtractedValue): Scalar | null => {
  switch (value.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'tax_id':
    case 'select':
      return value.value === null ? null : { type: 'text', value: value.value }
    case 'number':
      return value.value === null ? null : { type: 'number', value: value.value }
    case 'date':
      return value.value === null ? null : { type: 'date', value: value.value }
    case 'boolean':
      return value.value === null ? null : { type: 'boolean', value: value.value }
    case 'money':
      return value.value === null
        ? null
        : { type: 'money', amount: value.value.amount, currency: value.value.currency }
    default: {
      const unreachable: never = value
      throw new Error(`Unknown value: ${String(unreachable)}`)
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Checks `value` is of the expected type and wraps it; null when it isn't (a registry bug or a bad constant). */
const toScalar = (type: ExprType, value: unknown, currency: CurrencyCode | null): Scalar | null => {
  switch (type) {
    case 'text':
      return typeof value === 'string' ? { type, value } : null
    case 'date':
      return typeof value === 'string' ? { type, value } : null
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? { type, value } : null
    case 'boolean':
      return typeof value === 'boolean' ? { type, value } : null
    case 'money': {
      const amount = isRecord(value) ? value.amount : value
      return typeof amount === 'number' && Number.isFinite(amount) ? { type, amount, currency } : null
    }
    default: {
      const unreachable: never = type
      throw new Error(`Unknown type: ${String(unreachable)}`)
    }
  }
}

/** What a function receives: money without currency, everything else as is. */
const toRuntime = (scalar: Scalar): unknown => {
  switch (scalar.type) {
    case 'money':
      return { amount: scalar.amount }
    case 'text':
    case 'number':
    case 'date':
    case 'boolean':
      return scalar.value
    default: {
      const unreachable: never = scalar
      throw new Error(`Unknown value: ${String(unreachable)}`)
    }
  }
}

const typeNameOf = (node: Node): TypeName => {
  switch (node.kind) {
    case 'scalar':
      return node.scalar.type
    case 'empty':
      return node.type
    case 'list':
      return `${node.type}[]`
    default: {
      const unreachable: never = node
      throw new Error(`Unknown node: ${String(unreachable)}`)
    }
  }
}

// ---------- currency ----------
const scalarsOf = (node: Node): Scalar[] =>
  node.kind === 'scalar' ? [node.scalar] : node.kind === 'list' ? node.items : []

/** Gives every money in `nodes` the one currency they share. Different currencies fail; none known leaves them as they are. */
const shareCurrency = (nodes: readonly Node[]): EvalResult<{ nodes: Node[]; currency: CurrencyCode | null }> => {
  const currencies = new Set<CurrencyCode>()
  for (const scalar of nodes.flatMap(scalarsOf)) {
    if (scalar.type === 'money' && scalar.currency !== null) currencies.add(scalar.currency)
  }
  if (currencies.size > 1) return fail('currency_mismatch')
  const currency = [...currencies][0] ?? null
  const adopt = (scalar: Scalar): Scalar =>
    scalar.type === 'money' && scalar.currency === null ? { ...scalar, currency } : scalar
  return ok({
    nodes: nodes.map((node): Node => {
      switch (node.kind) {
        case 'scalar':
          return { kind: 'scalar', scalar: adopt(node.scalar) }
        case 'list':
          return { ...node, items: node.items.map(adopt) }
        case 'empty':
          return node
        default: {
          const unreachable: never = node
          throw new Error(`Unknown node: ${String(unreachable)}`)
        }
      }
    }),
    currency,
  })
}

// ---------- evaluation ----------
const evalField = (expr: Extract<Expr, { kind: 'field' }>, ctx: EvalContext): EvalResult<Node> => {
  const field = ctx.fields.find((f) => f.id === expr.fieldId)
  const type = field ? exprTypeOfField(field.type) : null
  if (!field || type === null) return fail('type_mismatch')
  const value = ctx.values[field.id]
  if (value === undefined) return ok({ kind: 'empty', type })
  if (value.type === 'table' || value.type !== field.type) return fail('type_mismatch')
  const scalar = fromExtracted(value)
  return scalar === null ? ok({ kind: 'empty', type }) : scalarNode(scalar)
}

const evalColumn = (expr: Extract<Expr, { kind: 'column' }>, ctx: EvalContext): EvalResult<Node> => {
  const field = ctx.fields.find((f) => f.id === expr.fieldId)
  const column = field?.type === 'table' ? field.columns?.find((c) => c.id === expr.columnId) : undefined
  const type = column ? exprTypeOfField(column.type) : null
  if (!column || type === null) return fail('type_mismatch')
  const value = ctx.values[expr.fieldId]
  if (value === undefined) return ok({ kind: 'list', type, items: [] })
  if (value.type !== 'table') return fail('type_mismatch')
  // empty cells are skipped
  const items = value.rows.flatMap((row) => {
    const cell = row.cells[column.id]
    const scalar = cell && cell.type === column.type ? fromExtracted(cell) : null
    return scalar ? [scalar] : []
  })
  return ok({ kind: 'list', type, items })
}

const evalConst = (expr: Extract<Expr, { kind: 'const' }>): EvalResult<Node> => {
  const type = exprTypeOfField(expr.type)
  if (type === null) return fail('type_mismatch')
  if (type === 'date' && (typeof expr.value !== 'string' || parseIsoDate(expr.value) === null)) {
    return fail('type_mismatch')
  }
  // a money constant is the amount in minor units, its currency is decided by its neighbours
  const scalar = toScalar(type, expr.value, null)
  return scalar === null ? fail('type_mismatch') : scalarNode(scalar)
}

const evalCall = (expr: Extract<Expr, { kind: 'call' }>, ctx: EvalContext): EvalResult<Node> => {
  const fn = getFunction(expr.fn)
  const evaluated: Node[] = []
  for (const arg of expr.args) {
    const result = evalNode(arg, ctx)
    if (!result.ok) return result
    evaluated.push(result.value)
  }
  const shared = shareCurrency(evaluated)
  if (!shared.ok) return shared
  const { nodes, currency } = shared.value

  const argTypes = nodes.map(typeNameOf)
  const signature = fn.signatures.find((s) => signatureFits(s, argTypes))
  if (!signature) return fail('type_mismatch')

  const args: unknown[] = []
  for (const node of nodes) {
    if (node.kind === 'list') args.push(node.items.map(toRuntime))
    else if (node.kind === 'scalar') args.push(toRuntime(node.scalar))
    else if (signature.acceptsEmpty) args.push(null)
    else return fail('missing_value')
  }

  const result = signature.evaluate(args)
  if (!result.ok) return result
  const scalar = toScalar(signature.result, result.value, currency)
  return scalar === null ? fail('type_mismatch') : scalarNode(scalar)
}

const evalNode = (expr: Expr, ctx: EvalContext): EvalResult<Node> => {
  switch (expr.kind) {
    case 'field':
      return evalField(expr, ctx)
    case 'column':
      return evalColumn(expr, ctx)
    case 'const':
      return evalConst(expr)
    case 'call':
      return evalCall(expr, ctx)
    default: {
      const unreachable: never = expr
      throw new Error(`Unknown expression: ${String(unreachable)}`)
    }
  }
}

/** A finished value: not a list, not empty, and money has its currency. */
const finish = (node: Node): ExprResult => {
  if (node.kind === 'list') return fail('type_mismatch')
  if (node.kind === 'empty') return fail('missing_value')
  const { scalar } = node
  if (scalar.type !== 'money') return ok(scalar)
  // nothing determined the currency of this money: it is never defaulted
  if (scalar.currency === null) return fail('currency_mismatch')
  return ok({ type: 'money', value: { amount: scalar.amount, currency: scalar.currency } })
}

/**
 * Evaluates an expression. Fails with `missing_value` (an empty input), `type_mismatch` (a wrong
 * argument type, a deleted field, a list where a value is needed), `currency_mismatch` (different
 * or undetermined currencies) or `division_by_zero`.
 */
export const evaluateExpr = (expr: Expr, ctx: EvalContext): ExprResult => {
  const node = evalNode(expr, ctx)
  return node.ok ? finish(node.value) : node
}

// ---------- reading an expression ----------
/** The ids of the top-level fields an expression reads (a column counts as its table field), each once. */
export const collectFieldIds = (expr: Expr): string[] => {
  const ids = new Set<string>()
  const visit = (e: Expr) => {
    switch (e.kind) {
      case 'field':
      case 'column':
        ids.add(e.fieldId)
        break
      case 'const':
        break
      case 'call':
        e.args.forEach(visit)
        break
      default: {
        const unreachable: never = e
        throw new Error(`Unknown expression: ${String(unreachable)}`)
      }
    }
  }
  visit(expr)
  return [...ids]
}

/** Of the fields an expression reads, the ones that have no value (a table counts when the column has no values). */
const findEmptyInputs = (expr: Expr, ctx: EvalContext): string[] => {
  const empty = new Set<string>()
  const visit = (e: Expr) => {
    switch (e.kind) {
      case 'field':
      case 'column': {
        const node = evalNode(e, ctx)
        if (node.ok && (node.value.kind === 'empty' || (node.value.kind === 'list' && node.value.items.length === 0))) {
          empty.add(e.fieldId)
        }
        break
      }
      case 'const':
        break
      case 'call':
        e.args.forEach(visit)
        break
      default: {
        const unreachable: never = e
        throw new Error(`Unknown expression: ${String(unreachable)}`)
      }
    }
  }
  visit(expr)
  return [...empty]
}

const INFIX: Partial<Record<FunctionId, { symbol: string; precedence: number }>> = {
  add: { symbol: '+', precedence: 1 },
  subtract: { symbol: '−', precedence: 1 },
  multiply: { symbol: '×', precedence: 2 },
  divide: { symbol: '÷', precedence: 2 },
}

const describeConst = (expr: Extract<Expr, { kind: 'const' }>): string => {
  if (expr.type === 'money' && typeof expr.value === 'number') return (expr.value / 100).toFixed(2)
  if (typeof expr.value === 'string') return expr.type === 'date' ? expr.value : `"${expr.value}"`
  return String(expr.value)
}

/**
 * A readable line for an expression: "Net total + VAT total", "sum(Line items › Net)".
 * add/subtract/multiply/divide are infix (parenthesized when nested), the rest are function calls.
 */
export const describeExpr = (expr: Expr, fields: readonly FieldDef[]): string => {
  const label = (id: string) => fields.find((f) => f.id === id)?.label ?? '(deleted field)'
  const describe = (e: Expr, parent?: { precedence: number; rightOfNonCommutative: boolean }): string => {
    switch (e.kind) {
      case 'field':
        return label(e.fieldId)
      case 'column': {
        const column = fields.find((f) => f.id === e.fieldId)?.columns?.find((c) => c.id === e.columnId)
        return `${label(e.fieldId)} › ${column?.label ?? '(deleted column)'}`
      }
      case 'const':
        return describeConst(e)
      case 'call': {
        const infix = INFIX[e.fn]
        if (!infix) return `${e.fn}(${e.args.map((arg) => describe(arg)).join(', ')})`
        const nonCommutative = e.fn === 'subtract' || e.fn === 'divide'
        const text = e.args
          .map((arg, i) => describe(arg, { precedence: infix.precedence, rightOfNonCommutative: nonCommutative && i > 0 }))
          .join(` ${infix.symbol} `)
        const needsParens =
          parent !== undefined &&
          (infix.precedence < parent.precedence ||
            (infix.precedence === parent.precedence && parent.rightOfNonCommutative))
        return needsParens ? `(${text})` : text
      }
      default: {
        const unreachable: never = e
        throw new Error(`Unknown expression: ${String(unreachable)}`)
      }
    }
  }
  return describe(expr)
}

// ---------- computed fields ----------
export type ComputeOutcome =
  | { ok: true; value: AnyExtractedValue }
  | { ok: false; reason: EvalFailureReason | 'cycle'; fieldIds: string[] }

/** The value as the target field's type, with confidence 1; null when the field's type doesn't match the result. */
const toExtracted = (field: FieldDef, value: EvalValue): AnyExtractedValue | null => {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'tax_id':
    case 'select':
      return value.type === 'text' ? { type: field.type, value: value.value, confidence: 1 } : null
    case 'number':
      return value.type === 'number' ? { type: 'number', value: value.value, confidence: 1 } : null
    case 'date':
      return value.type === 'date' ? { type: 'date', value: value.value, confidence: 1 } : null
    case 'boolean':
      return value.type === 'boolean' ? { type: 'boolean', value: value.value, confidence: 1 } : null
    case 'money':
      return value.type === 'money' ? { type: 'money', value: value.value, confidence: 1 } : null
    case 'table':
      return null
    default: {
      const unreachable: never = field.type
      throw new Error(`Unknown field type: ${String(unreachable)}`)
    }
  }
}

/**
 * Evaluates the compute actions in dependency order (a computed field can feed another one) and
 * returns one outcome per computed field. Stored values of computed fields are ignored. A cycle fails
 * every field in it with `cycle`; a field that depends on a failed one gets `missing_value`.
 */
export const computeValues = (
  type: Pick<DocumentType, 'fields' | 'actions'>,
  values: Record<string, FieldValue>,
): Record<string, ComputeOutcome> => {
  const actions = getComputeActions(type)
  const working: Record<string, FieldValue> = { ...values }
  for (const fieldId of actions.keys()) delete working[fieldId]

  const outcomes: Record<string, ComputeOutcome> = {}
  const stack: string[] = []

  const resolve = (fieldId: string) => {
    if (outcomes[fieldId]) return
    const at = stack.indexOf(fieldId)
    if (at !== -1) {
      const cycle = stack.slice(at)
      for (const id of cycle) outcomes[id] = { ok: false, reason: 'cycle', fieldIds: cycle }
      return
    }
    const action = actions.get(fieldId)
    if (!action) return
    stack.push(fieldId)
    for (const dependency of collectFieldIds(action.expr)) if (actions.has(dependency)) resolve(dependency)
    stack.pop()
    // a deeper call may have found that this field is part of a cycle
    if (outcomes[fieldId]) return

    const ctx: EvalContext = { fields: type.fields, values: working }
    const result = evaluateExpr(action.expr, ctx)
    const field = type.fields.find((f) => f.id === fieldId)
    const extracted = result.ok && field ? toExtracted(field, result.value) : null
    if (extracted) {
      working[fieldId] = extracted
      outcomes[fieldId] = { ok: true, value: extracted }
      return
    }
    const reason = result.ok || !field ? 'type_mismatch' : result.reason
    outcomes[fieldId] = {
      ok: false,
      reason,
      fieldIds: reason === 'missing_value' ? findEmptyInputs(action.expr, ctx) : collectFieldIds(action.expr),
    }
  }

  for (const fieldId of actions.keys()) resolve(fieldId)
  return outcomes
}

// ---------- checks ----------
/** Which operators a check may use on values of this type: dates all of them, text and boolean only eq / neq. */
export const allowedOps = (type: ExprType): readonly CompareOp[] => {
  switch (type) {
    case 'number':
    case 'money':
    case 'date':
      return ['eq', 'neq', 'lt', 'lte', 'gt', 'gte']
    case 'text':
    case 'boolean':
      return ['eq', 'neq']
    default: {
      const unreachable: never = type
      throw new Error(`Unknown type: ${String(unreachable)}`)
    }
  }
}

/** Only numbers (absolute) and money (minor units) have a tolerance. */
export const supportsTolerance = (type: ExprType): boolean => type === 'number' || type === 'money'

export type CheckOutcome =
  | { status: 'passed'; check: CheckAction; left: EvalValue; right: EvalValue }
  | { status: 'failed'; check: CheckAction; left: EvalValue; right: EvalValue }
  | {
      status: 'error'
      check: CheckAction
      reason: EvalFailureReason
      /** every field the check reads */
      fieldIds: string[]
      /** of those, the ones without a value (what `missing_value` is about) */
      emptyFieldIds: string[]
    }

/** Tolerance widens what counts as equal; for lt/gt it moves the line the same way. */
const compareNumbers = (left: number, op: CompareOp, right: number, tolerance: number): boolean => {
  switch (op) {
    case 'eq':
      return Math.abs(left - right) <= tolerance
    case 'neq':
      return Math.abs(left - right) > tolerance
    case 'lt':
      return left < right - tolerance
    case 'lte':
      return left <= right + tolerance
    case 'gt':
      return left > right + tolerance
    case 'gte':
      return left >= right - tolerance
    default: {
      const unreachable: never = op
      throw new Error(`Unknown operator: ${String(unreachable)}`)
    }
  }
}

/** null: these two values can't be compared with this operator. */
const compareValues = (left: EvalValue, op: CompareOp, right: EvalValue, tolerance: number): boolean | null => {
  if (!allowedOps(left.type).includes(op)) return null
  switch (left.type) {
    case 'number':
      return right.type === 'number' ? compareNumbers(left.value, op, right.value, tolerance) : null
    case 'money':
      return right.type === 'money' ? compareNumbers(left.value.amount, op, right.value.amount, tolerance) : null
    case 'date': {
      if (right.type !== 'date') return null
      const [a, b] = [parseIsoDate(left.value), parseIsoDate(right.value)]
      // the tolerance is not used for dates
      return a === null || b === null ? null : compareNumbers(a, op, b, 0)
    }
    case 'text':
      return right.type === 'text' ? (op === 'eq') === (left.value === right.value) : null
    case 'boolean':
      return right.type === 'boolean' ? (op === 'eq') === (left.value === right.value) : null
    default: {
      const unreachable: never = left
      throw new Error(`Unknown value: ${String(unreachable)}`)
    }
  }
}

const evaluateSides = (
  check: CheckAction,
  ctx: EvalContext,
): EvalResult<{ left: EvalValue; right: EvalValue }> => {
  const left = evalNode(check.left, ctx)
  if (!left.ok) return left
  const right = evalNode(check.right, ctx)
  if (!right.ok) return right
  // both sides share the document's currency, so a money constant on one side adopts the other's
  const shared = shareCurrency([left.value, right.value])
  if (!shared.ok) return shared
  const [leftNode, rightNode] = shared.value.nodes
  const leftDone = finish(leftNode)
  if (!leftDone.ok) return leftDone
  const rightDone = finish(rightNode)
  if (!rightDone.ok) return rightDone
  return ok({ left: leftDone.value, right: rightDone.value })
}

const runCheck = (check: CheckAction, ctx: EvalContext): CheckOutcome => {
  const sides = evaluateSides(check, ctx)
  const passed = sides.ok ? compareValues(sides.value.left, check.op, sides.value.right, check.tolerance ?? 0) : null
  if (sides.ok && passed !== null) {
    return { status: passed ? 'passed' : 'failed', check, left: sides.value.left, right: sides.value.right }
  }
  const reason: EvalFailureReason = sides.ok ? 'type_mismatch' : sides.reason
  const fieldIds = [...new Set([...collectFieldIds(check.left), ...collectFieldIds(check.right)])]
  const emptyFieldIds =
    reason === 'missing_value'
      ? [...new Set([...findEmptyInputs(check.left, ctx), ...findEmptyInputs(check.right, ctx)])]
      : []
  return { status: 'error', check, reason, fieldIds, emptyFieldIds }
}

/**
 * Runs every check of the type on the document. Computed fields are recomputed first and win over
 * stored values, so a check on a computed field sees its current value. A check that can't be
 * evaluated is an `error` (with its reason and the fields involved), never `failed`.
 */
export const runChecks = (
  type: Pick<DocumentType, 'fields' | 'actions'>,
  document: Pick<Document, 'values'>,
): CheckOutcome[] => {
  const values: Record<string, FieldValue> = { ...document.values }
  for (const [fieldId, outcome] of Object.entries(computeValues(type, document.values))) {
    if (outcome.ok) values[fieldId] = outcome.value
    else delete values[fieldId]
  }
  const ctx: EvalContext = { fields: type.fields, values }
  return type.actions.flatMap((action) => (action.kind === 'check' ? [runCheck(action, ctx)] : []))
}
