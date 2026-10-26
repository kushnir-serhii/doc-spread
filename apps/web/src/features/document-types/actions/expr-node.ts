import { describeExpr } from '@/lib/fields/evaluate'
import type { Expr, FieldDef, FunctionId } from '@/lib/mock/types'

/**
 * An expression while it is being built: like `Expr`, but a slot can still be empty.
 * An empty id (`fieldId: ''`) or a constant with a `null` value means "kind chosen, value not yet".
 * Every `Expr` is an `ExprNode`.
 */
export type ExprNode =
  | { kind: 'empty' }
  | Exclude<Expr, { kind: 'call' }>
  | { kind: 'call'; fn: FunctionId; args: ExprNode[] }

export type CallNode = Extract<ExprNode, { kind: 'call' }>
export type ConstNode = Extract<ExprNode, { kind: 'const' }>

export const EMPTY_NODE: ExprNode = { kind: 'empty' }

/** The finished expression, or null while any slot is empty. */
export const toExpr = (node: ExprNode): Expr | null => {
  switch (node.kind) {
    case 'empty':
      return null
    case 'field':
      return node.fieldId === '' ? null : node
    case 'column':
      return node.fieldId === '' || node.columnId === '' ? null : node
    case 'const':
      return node.value === null || node.value === undefined ? null : node
    case 'call': {
      const args: Expr[] = []
      for (const arg of node.args) {
        const expr = toExpr(arg)
        if (expr === null) return null
        args.push(expr)
      }
      return { kind: 'call', fn: node.fn, args }
    }
    default: {
      const unreachable: never = node
      throw new Error(`Unknown expression: ${String(unreachable)}`)
    }
  }
}

/** The top-level fields an unfinished expression reads (a column counts as its table). */
export const nodeFieldIds = (node: ExprNode): string[] => {
  switch (node.kind) {
    case 'field':
    case 'column':
      return node.fieldId === '' ? [] : [node.fieldId]
    case 'call':
      return [...new Set(node.args.flatMap(nodeFieldIds))]
    case 'empty':
    case 'const':
      return []
    default: {
      const unreachable: never = node
      throw new Error(`Unknown expression: ${String(unreachable)}`)
    }
  }
}

const PLACEHOLDER_ID = '__empty__'
const PLACEHOLDER_FIELD: FieldDef = {
  id: PLACEHOLDER_ID,
  key: PLACEHOLDER_ID,
  label: '…',
  type: 'text',
  required: false,
  examples: [],
}

const placeholders = (node: ExprNode): Expr => {
  switch (node.kind) {
    case 'call':
      return { kind: 'call', fn: node.fn, args: node.args.map(placeholders) }
    case 'empty':
      return { kind: 'field', fieldId: PLACEHOLDER_ID }
    case 'field':
      return node.fieldId === '' ? { kind: 'field', fieldId: PLACEHOLDER_ID } : node
    case 'column':
      return node.fieldId === '' || node.columnId === '' ? { kind: 'field', fieldId: PLACEHOLDER_ID } : node
    case 'const':
      return node.value === null || node.value === undefined ? { kind: 'field', fieldId: PLACEHOLDER_ID } : node
    default: {
      const unreachable: never = node
      throw new Error(`Unknown expression: ${String(unreachable)}`)
    }
  }
}

/** A readable line for a finished or unfinished expression: "Net total + …". */
export const describeNode = (node: ExprNode, fields: readonly FieldDef[]): string =>
  describeExpr(placeholders(node), [...fields, PLACEHOLDER_FIELD])
