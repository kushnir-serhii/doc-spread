import type { FieldDef } from '@/lib/mock/types'
import { effectiveOp, shownLabel, type ActionForm, type ComputeForm } from './action-form'
import { OP_SYMBOL } from '@/lib/fields/check-ops'
import { describeNode } from './expr-node'
import { scalarTypeOf } from './expr-typing'
import { tableColumns } from './row-scope'

interface ActionLineProps {
  form: ActionForm
  fields: readonly FieldDef[]
}

const targetLabel = (form: ComputeForm, fields: readonly FieldDef[]) =>
  form.scope.kind === 'row'
    ? (tableColumns(fields, form.scope.tableFieldId).find((c) => c.id === form.columnId)?.label ?? '…')
    : (fields.find((f) => f.id === form.fieldId)?.label ?? '…')

/** The action as one readable line, updated as it is built: "Gross total = Net total + VAT total". */
export const ActionLine = ({ form, fields }: ActionLineProps) => {
  const text =
    form.kind === 'check'
      ? `${describeNode(form.left, fields)} ${OP_SYMBOL[effectiveOp(form.op, scalarTypeOf(form.left, fields))]} ${describeNode(form.right, fields)}`
      : `${targetLabel(form, fields)} = ${describeNode(form.expr, fields)}`
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">
        {form.kind === 'check'
          ? `${form.scope.kind === 'row' ? 'Row check' : 'Check'} “${shownLabel(form, fields)}”`
          : form.scope.kind === 'row'
            ? 'Computed column'
            : 'Computed'}
      </p>
      <p className="break-words text-sm font-medium" aria-label={`Expression: ${text}`}>
        {text}
      </p>
    </div>
  )
}
