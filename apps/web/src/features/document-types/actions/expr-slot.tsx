import { FUNCTIONS, type ExprType } from '@/lib/fields/functions'
import type { FieldDef, FunctionId } from '@/lib/mock/types'
import { CallArgs } from './call-args'
import { ColumnSelect } from './column-select'
import { ConstInput } from './const-input'
import { EMPTY_NODE, type ExprNode } from './expr-node'
import { constTypesForSlot, getArity, type Allowed } from './expr-typing'
import { FieldSelect } from './field-select'
import { KindButtons } from './kind-buttons'

interface ExprSlotProps {
  /** the accessible name, the whole path: "Left side › Add › Argument 1" */
  label: string
  /** the visible name; defaults to `label` */
  title?: string
  node: ExprNode
  /** the types this slot accepts */
  allowed: Allowed
  fields: readonly FieldDef[]
  onChange: (node: ExprNode) => void
}

/** Switching to another function keeps the arguments that are already there, padded or cut to the new count. */
const withFunction = (node: ExprNode, fn: FunctionId): ExprNode => {
  const { count, variadic } = getArity(FUNCTIONS[fn])
  const existing = node.kind === 'call' ? node.args : []
  const length = variadic ? Math.max(count, existing.length) : count
  return {
    kind: 'call',
    fn,
    args: Array.from({ length }, (_, i) => existing[i] ?? EMPTY_NODE),
  }
}

/** One place in an expression: pick a field, a column, a constant or a function; a function opens slots for its arguments. */
export const ExprSlot = ({ label, title = label, node, allowed, fields, onChange }: ExprSlotProps) => {
  const constTypes: ExprType[] = constTypesForSlot(allowed)
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <KindButtons
        label={label}
        node={node}
        fields={fields}
        allowed={allowed}
        onKind={(kind) => {
          if (kind === 'field') onChange({ kind: 'field', fieldId: '' })
          else if (kind === 'column') onChange({ kind: 'column', fieldId: '', columnId: '' })
          else onChange({ kind: 'const', type: constTypes[0] ?? 'text', value: null })
        }}
        onFunction={(fn) => onChange(withFunction(node, fn))}
      />
      {node.kind === 'field' && (
        <FieldSelect
          label={label}
          fields={fields}
          allowed={allowed}
          value={node.fieldId}
          onChange={(fieldId) => onChange({ kind: 'field', fieldId })}
        />
      )}
      {node.kind === 'column' && (
        <ColumnSelect
          label={label}
          fields={fields}
          allowed={allowed}
          fieldId={node.fieldId}
          columnId={node.columnId}
          onChange={(fieldId, columnId) => onChange({ kind: 'column', fieldId, columnId })}
        />
      )}
      {node.kind === 'const' && (
        <ConstInput label={label} node={node} types={constTypes} onChange={onChange} />
      )}
      {node.kind === 'call' && (
        <CallArgs label={label} node={node} fields={fields} allowed={allowed} onChange={onChange} />
      )}
    </div>
  )
}
