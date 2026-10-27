import { FUNCTIONS } from '@/lib/fields/functions'
import type { FieldDef } from '@/lib/mock/types'
import type { ExprNode } from './expr-node'
import { argAllowed, describeAllowed, getArity, nodeType, type Allowed } from './expr-typing'

/** The one message for "a slot is still empty"; the editor shows it softly, validation as a problem. */
export const INCOMPLETE = 'The expression is incomplete.'

const labelOf = (field: FieldDef) => `“${field.label.trim() || 'Untitled field'}”`

/** What is wrong with the expression where `allowed` types are wanted. Empty = fine. Messages are unique. */
export const exprProblems = (node: ExprNode, fields: readonly FieldDef[], allowed: Allowed): string[] => {
  const found: string[] = []
  const walk = (current: ExprNode, wanted: Allowed) => {
    switch (current.kind) {
      case 'empty':
        found.push(INCOMPLETE)
        return
      case 'field': {
        if (current.fieldId === '') return void found.push(INCOMPLETE)
        const field = fields.find((f) => f.id === current.fieldId)
        if (!field) return void found.push('A field used in the expression was deleted.')
        const type = nodeType(current, fields)
        if (type === null) return void found.push(`${labelOf(field)} is a table. Use one of its columns instead.`)
        if (!wanted.includes(type)) {
          found.push(`${labelOf(field)} is ${describeAllowed([type])}, but ${describeAllowed(wanted)} is needed here.`)
        }
        return
      }
      case 'column': {
        if (current.fieldId === '' || current.columnId === '') return void found.push(INCOMPLETE)
        const table = fields.find((f) => f.id === current.fieldId)
        const column = table?.columns?.find((c) => c.id === current.columnId)
        if (!table || !column) return void found.push('A table column used in the expression was deleted.')
        const type = nodeType(current, fields)
        if (type === null || !wanted.includes(type)) {
          found.push(
            `${labelOf(table)} › ${labelOf(column)} is ${type === null ? 'not usable' : describeAllowed([type])}, but ${describeAllowed(wanted)} is needed here.`,
          )
        }
        return
      }
      case 'cell':
        // the document-level editor never offers it; the row editor comes with spec 017 slice 2
        return void found.push(current.columnId === '' ? INCOMPLETE : 'A row’s cell can only be used in a row action.')
      case 'const': {
        if (current.value === null || current.value === undefined) return void found.push(INCOMPLETE)
        const type = nodeType(current, fields)
        if (type === null || !wanted.includes(type)) {
          found.push(`A constant of ${describeAllowed(type ? [type] : [])} is used where ${describeAllowed(wanted)} is needed.`)
        }
        return
      }
      case 'call': {
        const fn = FUNCTIONS[current.fn]
        const results = fn.signatures.map((signature) => signature.result)
        if (!results.some((result) => wanted.includes(result))) {
          found.push(`“${fn.label}” gives ${describeAllowed(results)}, but ${describeAllowed(wanted)} is needed here.`)
          return
        }
        const arity = getArity(fn)
        if (arity.variadic ? current.args.length < arity.count : current.args.length !== arity.count) {
          found.push(`“${fn.label}” needs ${arity.variadic ? 'at least ' : ''}${arity.count} arguments.`)
          return
        }
        current.args.forEach((arg, index) => walk(arg, argAllowed(current, index, fields, wanted)))
        return
      }
      default: {
        const unreachable: never = current
        throw new Error(`Unknown expression: ${String(unreachable)}`)
      }
    }
  }
  walk(node, allowed)
  return [...new Set(found)]
}
