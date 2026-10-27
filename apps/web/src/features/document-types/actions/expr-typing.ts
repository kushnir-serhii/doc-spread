import {
  EXPR_TYPES,
  FUNCTION_LIST,
  FUNCTIONS,
  exprTypeOfField,
  signatureFits,
  type ExprType,
  type FunctionDef,
  type Signature,
  type TypeName,
} from '@/lib/fields/functions'
import type { ColumnDef, FieldDef } from '@/lib/mock/types'
import type { CallNode, ExprNode } from './expr-node'

/** The types a slot accepts: scalars, and lists (a table column) where the function takes one. */
export type Allowed = readonly TypeName[]

export const ANY_SCALAR: Allowed = EXPR_TYPES

export const TYPE_LABEL: Record<TypeName, string> = {
  text: 'text',
  number: 'a number',
  money: 'an amount of money',
  date: 'a date',
  boolean: 'yes/no',
  'text[]': 'a list of texts',
  'number[]': 'a list of numbers',
  'money[]': 'a list of amounts',
  'date[]': 'a list of dates',
  'boolean[]': 'a list of yes/no values',
}

export const describeAllowed = (allowed: Allowed) =>
  allowed.length === 0 ? 'nothing' : allowed.map((type) => TYPE_LABEL[type]).join(' or ')

/** The type of the i-th argument of a signature. */
const paramTypeAt = (signature: Signature, index: number): TypeName | undefined =>
  signature.params.kind === 'fixed' ? signature.params.args[index] : signature.params.arg

/** How many arguments a function takes: exactly `count`, or `count` or more when variadic. */
export const getArity = (fn: FunctionDef): { variadic: boolean; count: number } => {
  const params = fn.signatures[0].params
  return params.kind === 'fixed' ? { variadic: false, count: params.args.length } : { variadic: true, count: params.min }
}

export const columnType = (column: ColumnDef): ExprType | null => exprTypeOfField(column.type)

/** The signatures of a call that fit its arguments so far (empty slots fit anything). */
export const viableSignatures = (call: CallNode, fields: readonly FieldDef[]): Signature[] => {
  const types = call.args.map((arg) => nodeType(arg, fields))
  return FUNCTIONS[call.fn].signatures.filter((signature) => signatureFits(signature, types))
}

/** The type of a node, or null while it isn't known (empty, deleted, or a call whose result is still open). */
export const nodeType = (node: ExprNode, fields: readonly FieldDef[]): TypeName | null => {
  switch (node.kind) {
    case 'empty':
      return null
    case 'field': {
      const field = fields.find((f) => f.id === node.fieldId)
      return field ? exprTypeOfField(field.type) : null
    }
    case 'column': {
      const column = fields.find((f) => f.id === node.fieldId)?.columns?.find((c) => c.id === node.columnId)
      const type = column ? columnType(column) : null
      return type ? `${type}[]` : null
    }
    case 'cell': {
      const column = fields.flatMap((f) => f.columns ?? []).find((c) => c.id === node.columnId)
      return column ? columnType(column) : null
    }
    case 'const':
      return exprTypeOfField(node.type)
    case 'call': {
      const results = new Set(viableSignatures(node, fields).map((signature) => signature.result))
      return results.size === 1 ? [...results][0] : null
    }
    default: {
      const unreachable: never = node
      throw new Error(`Unknown expression: ${String(unreachable)}`)
    }
  }
}

/** The scalar type of a node; null for a list or while unknown. */
export const scalarTypeOf = (node: ExprNode, fields: readonly FieldDef[]): ExprType | null => {
  const type = nodeType(node, fields)
  return type !== null && !type.endsWith('[]') ? (EXPR_TYPES.find((t) => t === type) ?? null) : null
}

/** What the i-th argument may be: what the other arguments and the wanted result leave open. */
export const argAllowed = (call: CallNode, index: number, fields: readonly FieldDef[], result: Allowed): Allowed => {
  const types = call.args.map((arg, i) => (i === index ? null : nodeType(arg, fields)))
  const allowed = new Set<TypeName>()
  for (const signature of FUNCTIONS[call.fn].signatures) {
    if (!result.includes(signature.result) || !signatureFits(signature, types)) continue
    const type = paramTypeAt(signature, index)
    if (type) allowed.add(type)
  }
  return [...allowed]
}

/** Functions with a signature whose result fits the slot, in UI order. */
export const functionsForSlot = (allowed: Allowed): readonly FunctionDef[] =>
  FUNCTION_LIST.filter((fn) => fn.signatures.some((signature) => allowed.includes(signature.result)))

/** Scalar top-level fields whose type fits. */
export const fieldsForSlot = (fields: readonly FieldDef[], allowed: Allowed): FieldDef[] =>
  fields.filter((field) => {
    const type = exprTypeOfField(field.type)
    return type !== null && allowed.includes(type)
  })

/** Columns of table fields that fit as a list. */
export const columnsForSlot = (fields: readonly FieldDef[], allowed: Allowed) =>
  fields.flatMap((table) =>
    table.type === 'table'
      ? (table.columns ?? []).flatMap((column) => {
          const type = columnType(column)
          return type !== null && allowed.includes(`${type}[]`) ? [{ table, column }] : []
        })
      : [],
  )

/** The constant types a slot can take. */
export const constTypesForSlot = (allowed: Allowed): ExprType[] => EXPR_TYPES.filter((type) => allowed.includes(type))
