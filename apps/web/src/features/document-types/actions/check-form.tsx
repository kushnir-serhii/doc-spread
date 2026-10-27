import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { allowedOps } from '@/lib/fields/evaluate'
import type { FieldDef } from '@/lib/mock/types'
import { effectiveOp, shownLabel, type CheckForm as CheckFormState } from './action-form'
import { OP_LABEL } from '@/lib/fields/check-ops'
import { CheckSettings } from './check-settings'
import { ExprSlot } from './expr-slot'
import { ANY_SCALAR, scalarTypeOf } from './expr-typing'
import type { RowScope } from './row-scope'
import { SlotSelect } from './slot-select'

interface CheckFormProps {
  form: CheckFormState
  fields: readonly FieldDef[]
  /** set when the check runs on every row of a table */
  row?: RowScope
  onChange: (form: CheckFormState) => void
}

/** Left side, operator, right side; then tolerance, severity and label. */
export const CheckForm = ({ form, fields, row, onChange }: CheckFormProps) => {
  const opId = useId()
  const leftType = scalarTypeOf(form.left, fields)
  const op = effectiveOp(form.op, leftType)
  const toleranceFor = leftType === 'money' || leftType === 'number' ? leftType : null
  const patch = (next: Partial<CheckFormState>) => onChange({ ...form, ...next })

  return (
    <div className="flex flex-col gap-5">
      <ExprSlot
        label="Left side"
        node={form.left}
        allowed={ANY_SCALAR}
        fields={fields}
        row={row}
        onChange={(left) => patch({ left })}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={opId}>Operator</Label>
        <SlotSelect
          id={opId}
          value={op}
          disabled={leftType === null}
          onChange={(event) => {
            const next = allowedOps(leftType ?? 'text').find((o) => o === event.target.value)
            if (next) patch({ op: next })
          }}
          className="max-w-64"
        >
          {(leftType === null ? ['eq' as const] : allowedOps(leftType)).map((o) => (
            <option key={o} value={o}>
              {OP_LABEL[o]}
            </option>
          ))}
        </SlotSelect>
        {leftType === null && <p className="text-xs text-muted-foreground">Finish the left side to choose an operator.</p>}
      </div>
      <ExprSlot
        label="Right side"
        node={form.right}
        allowed={leftType ? [leftType] : ANY_SCALAR}
        fields={fields}
        row={row}
        onChange={(right) => patch({ right })}
      />
      <CheckSettings
        form={form}
        fields={fields}
        toleranceFor={toleranceFor}
        label={shownLabel(form, fields)}
        onChange={patch}
      />
    </div>
  )
}
