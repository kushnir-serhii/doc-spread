import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { getRowComputeActions } from '@/lib/fields/computed-fields'
import { exprTypeOfField } from '@/lib/fields/functions'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { FieldAction, FieldDef } from '@/lib/mock/types'
import type { ComputeForm } from './action-form'
import { EMPTY_NODE } from './expr-node'
import { ExprSlot } from './expr-slot'
import { rowScopeOf } from './action-scope'
import { tableColumns } from './row-scope'
import { SlotSelect } from './slot-select'

interface RowComputeFormProps {
  form: ComputeForm
  /** the table whose rows are computed */
  tableFieldId: string
  fields: readonly FieldDef[]
  /** every action of the draft */
  actions: readonly FieldAction[]
  onChange: (form: ComputeForm) => void
}

/** Pick the column to compute in every row, then build its expression. The expression must give the column's type. */
export const RowComputeForm = ({ form, tableFieldId, fields, actions, onChange }: RowComputeFormProps) => {
  const targetId = useId()
  const computedElsewhere = getRowComputeActions({ actions: actions.filter((a) => a.id !== form.id) }).get(tableFieldId)
  const columns = tableColumns(fields, tableFieldId)
  const targets = columns.filter((c) => exprTypeOfField(c.type) !== null && !computedElsewhere?.has(c.id))
  const target = columns.find((c) => c.id === form.columnId)
  const type = target ? exprTypeOfField(target.type) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={targetId}>Computed column</Label>
        <SlotSelect
          id={targetId}
          value={form.columnId}
          aria-describedby={`${targetId}-help`}
          aria-invalid={form.columnId !== '' && !target ? true : undefined}
          // The expression is cleared with the target: it had to give the old column's type.
          onChange={(event) => onChange({ ...form, columnId: event.target.value, expr: EMPTY_NODE })}
          className="max-w-md"
        >
          <option value="">Choose a column…</option>
          {form.columnId !== '' && !target && <option value={form.columnId}>(deleted column)</option>}
          {targets.map((column) => (
            <option key={column.id} value={column.id}>
              {column.label || 'Untitled column'} ({FIELD_TYPE_META[column.type].label})
            </option>
          ))}
        </SlotSelect>
        <p id={`${targetId}-help`} className="text-xs text-muted-foreground">
          {targets.length === 0
            ? 'There is no column to compute: add a column to the table first, or every column is already computed.'
            : 'Its value is calculated in every row instead of being read from the document.'}
        </p>
      </div>
      {type !== null ? (
        <ExprSlot
          label="Expression"
          node={form.expr}
          allowed={[type]}
          fields={fields}
          row={rowScopeOf({ kind: 'row', tableFieldId }, form.id, form.columnId, actions)}
          onChange={(expr) => onChange({ ...form, expr })}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Choose the column first; the expression must give its type.</p>
      )}
    </div>
  )
}
