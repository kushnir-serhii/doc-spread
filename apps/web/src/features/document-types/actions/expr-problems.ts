import { FUNCTIONS } from '@/lib/fields/functions'
import type { FieldDef } from '@/lib/mock/types'
import type { ExprNode } from './expr-node'
import { argAllowed, describeAllowed, getArity, nodeType, type Allowed } from './expr-typing'
import type { RowScope } from './row-scope'

/** The one message for "a slot is still empty"; the editor shows it softly, validation as a problem. */
export const INCOMPLETE = 'The expression is incomplete.'

const labelOf = (field: Pick<FieldDef, 'label'>) => `“${field.label.trim() || 'Untitled field'}”`

/**
 * What is wrong with the expression where `allowed` types are wanted. Empty = fine. Messages are unique.
 * `row` is set for a row action: it may read its table's cells but not computed document fields.
 */
export const exprProblems = (
  node: ExprNode,
  fields: readonly FieldDef[],
  allowed: Allowed,
  row?: RowScope,
): string[] => {
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
        if (row?.computedFieldIds.has(field.id)) {
          return void found.push(`${labelOf(field)} is computed, and a row action can’t read a computed field.`)
        }
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
        if (row?.blockedListColumnIds.has(column.id)) {
          return void found.push(
            `${labelOf(table)} › ${labelOf(column)} is computed, and a computed column can’t read the list of a computed column.`,
          )
        }
        const type = nodeType(current, fields)
        if (type === null || !wanted.includes(type)) {
          found.push(
            `${labelOf(table)} › ${labelOf(column)} is ${type === null ? 'not usable' : describeAllowed([type])}, but ${describeAllowed(wanted)} is needed here.`,
          )
        }
        return
      }
      case 'cell': {
        if (current.columnId === '') return void found.push(INCOMPLETE)
        if (!row) return void found.push('A row’s cell can only be used in a row action.')
        const table = fields.find((f) => f.id === row.tableFieldId)
        const column = table?.columns?.find((c) => c.id === current.columnId)
        if (!column) {
          const elsewhere = fields.some((f) => f.columns?.some((c) => c.id === current.columnId))
          return void found.push(
            elsewhere ? 'A cell used in the expression belongs to another table.' : 'A column used in the expression was deleted.',
          )
        }
        const type = nodeType(current, fields)
        if (type === null || !wanted.includes(type)) {
          found.push(
            `This row › ${labelOf(column)} is ${type === null ? 'not usable' : describeAllowed([type])}, but ${describeAllowed(wanted)} is needed here.`,
          )
        }
        return
      }
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
