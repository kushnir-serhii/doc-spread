import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { getComputeActions } from '@/lib/fields/computed-fields'
import { exprTypeOfField } from '@/lib/fields/functions'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { FieldAction, FieldDef } from '@/lib/mock/types'
import type { ComputeForm as ComputeFormState } from './action-form'
import { EMPTY_NODE } from './expr-node'
import { ExprSlot } from './expr-slot'
import { SlotSelect } from './slot-select'

interface ComputeFormProps {
  form: ComputeFormState
  fields: readonly FieldDef[]
  /** every action of the draft */
  actions: readonly FieldAction[]
  onChange: (form: ComputeFormState) => void
}

/** Pick the field to compute, then build its expression. The expression must give the field's type. */
export const ComputeForm = ({ form, fields, actions, onChange }: ComputeFormProps) => {
  const targetId = useId()
  const computedElsewhere = getComputeActions({ actions: actions.filter((a) => a.id !== form.id) })
  const targets = fields.filter((f) => exprTypeOfField(f.type) !== null && !computedElsewhere.has(f.id))
  const target = fields.find((f) => f.id === form.fieldId)
  const type = target ? exprTypeOfField(target.type) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={targetId}>Computed field</Label>
        <SlotSelect
          id={targetId}
          value={form.fieldId}
          aria-describedby={`${targetId}-help`}
          aria-invalid={form.fieldId !== '' && !target ? true : undefined}
          // The expression is cleared with the target: it had to give the old field's type.
          onChange={(event) => onChange({ ...form, fieldId: event.target.value, expr: EMPTY_NODE })}
          className="max-w-md"
        >
          <option value="">Choose a field…</option>
          {form.fieldId !== '' && !target && <option value={form.fieldId}>(deleted field)</option>}
          {targets.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label || 'Untitled field'} ({FIELD_TYPE_META[field.type].label})
            </option>
          ))}
        </SlotSelect>
        <p id={`${targetId}-help`} className="text-xs text-muted-foreground">
          {targets.length === 0
            ? 'There is no field to compute: add a field first, or one is already computed by another action.'
            : 'Its value is calculated in Review instead of being read from the document.'}
        </p>
      </div>
      {type !== null ? (
        <ExprSlot
          label="Expression"
          node={form.expr}
          allowed={[type]}
          fields={fields}
          onChange={(expr) => onChange({ ...form, expr })}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Choose the field first; the expression must give its type.</p>
      )}
    </div>
  )
}
