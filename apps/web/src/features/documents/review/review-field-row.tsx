import { useId } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldValueEdit } from '@/features/documents/fields/field-value-edit'
import { FieldValueView } from '@/features/documents/fields/field-value-view'
import { isLowConfidence } from '@/lib/fields/confidence'
import type { FieldDef, FieldValue } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

interface ReviewFieldRowProps {
  field: FieldDef
  value: FieldValue
  focusId: string
  /** set when the form is editable; tables stay read-only until slice 4 */
  onChange?: (next: FieldValue) => void
  onConfirm?: () => void
}

/** A table has no confidence of its own: show its weakest cell, or nothing for an empty table. */
const confidenceOf = (value: FieldValue): number | null => {
  if (value.type !== 'table') return value.confidence
  const scores = value.rows.flatMap((row) => Object.values(row.cells).map((cell) => cell.confidence))
  return scores.length === 0 ? null : Math.min(...scores)
}

export const ReviewFieldRow = ({ field, value, focusId, onChange, onConfirm }: ReviewFieldRowProps) => {
  const labelId = useId()
  const inputId = useId()
  const isTable = value.type === 'table'
  const editing = onChange !== undefined && !isTable
  const score = confidenceOf(value)
  const low = editing && score !== null && isLowConfidence(score)
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      // a table holds its own focus targets; an editable row is reached through the control inside it;
      // a read-only scalar row is the target itself
      tabIndex={isTable || editing ? undefined : 0}
      data-focus-id={isTable ? undefined : focusId}
      className={cn(
        'flex flex-col gap-1.5 rounded-md border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        low && 'rounded-lg border-transparent bg-confidence-low-bg ring-1 ring-confidence-low-dot/50 ring-inset [&_input]:bg-card',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Label
          id={labelId}
          htmlFor={editing ? inputId : undefined}
          className="min-w-0 text-sm font-medium text-muted-foreground"
        >
          {field.label}
          {field.required && (
            <>
              <span aria-hidden="true"> *</span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </Label>
        {score !== null && <ConfidenceBadge score={score} />}
      </div>
      {editing ? (
        <FieldValueEdit id={inputId} field={field} value={value} onChange={onChange} />
      ) : (
        <FieldValueView field={field} value={value} focusId={focusId} />
      )}
      {low && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Check this value — the AI isn’t sure
          </p>
          <Button variant="outline" className="min-h-touch bg-card" aria-label={`Confirm ${field.label}`} onClick={onConfirm}>
            <Check aria-hidden="true" />
            Confirm
          </Button>
        </div>
      )}
    </div>
  )
}
