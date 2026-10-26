import type { FieldDef } from '@/lib/mock/types'
import { effectiveOp, shownLabel, type ActionForm } from './action-form'
import { OP_SYMBOL } from './check-ops'
import { describeNode } from './expr-node'
import { scalarTypeOf } from './expr-typing'

interface ActionLineProps {
  form: ActionForm
  fields: readonly FieldDef[]
}

/** The action as one readable line, updated as it is built: "Gross total = Net total + VAT total". */
export const ActionLine = ({ form, fields }: ActionLineProps) => {
  const text =
    form.kind === 'check'
      ? `${describeNode(form.left, fields)} ${OP_SYMBOL[effectiveOp(form.op, scalarTypeOf(form.left, fields))]} ${describeNode(form.right, fields)}`
      : `${fields.find((f) => f.id === form.fieldId)?.label || '…'} = ${describeNode(form.expr, fields)}`
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">
        {form.kind === 'check' ? `Check “${shownLabel(form, fields)}”` : 'Computed'}
      </p>
      <p className="break-words text-sm font-medium" aria-label={`Expression: ${text}`}>
        {text}
      </p>
    </div>
  )
}
