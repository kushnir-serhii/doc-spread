import { useId } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldValueEdit } from '@/features/documents/fields/field-value-edit'
import { TableFieldView } from '@/features/documents/fields/table-field-view'
import { FieldValueView } from '@/features/documents/fields/field-value-view'
import { isLowConfidence } from '@/lib/fields/confidence'
import type { FieldDef, FieldValue } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { ReviewPointButton } from './review-point-button'
import { ReviewPointFeedback } from './review-point-feedback'
import type { ReviewPointing } from './use-review-pointing'

interface ReviewFieldRowProps {
  field: FieldDef
  value: FieldValue
  focusId: string
  /** set when the form is editable */
  onChange?: (next: FieldValue) => void
  onConfirm?: () => void
  /** pointing at the document; set for editable scalar rows */
  pointing?: ReviewPointing
}

/** A table has no confidence of its own: show its weakest cell, or nothing for an empty table. */
const confidenceOf = (value: FieldValue): number | null => {
  if (value.type !== 'table') return value.confidence
  const scores = value.rows.flatMap((row) => Object.values(row.cells).map((cell) => cell.confidence))
  return scores.length === 0 ? null : Math.min(...scores)
}

export const ReviewFieldRow = ({ field, value, focusId, onChange, onConfirm, pointing }: ReviewFieldRowProps) => {
  const labelId = useId()
  const inputId = useId()
  const isTable = value.type === 'table'
  const editing = onChange !== undefined && !isTable
  const editingTable = onChange !== undefined && value.type === 'table'
  const score = confidenceOf(value)
  const low = editing && score !== null && isLowConfidence(score)
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      // J/K move focus between rows (-1: not a Tab stop, the controls inside are); a read-only scalar row is one
      tabIndex={isTable || editing ? -1 : 0}
      data-focus-id={isTable ? undefined : focusId}
      data-field-id={field.id}
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
      {editingTable ? (
        <TableFieldView
          label={field.label}
          columns={field.columns ?? []}
          value={value}
          focusId={focusId}
          onChange={onChange}
        />
      ) : editing ? (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <FieldValueEdit id={inputId} field={field} value={value} onChange={onChange} />
          </div>
          {pointing && <ReviewPointButton fieldId={field.id} label={field.label} pointing={pointing} />}
        </div>
      ) : (
        <FieldValueView field={field} value={value} focusId={focusId} />
      )}
      {editing && pointing && <ReviewPointFeedback fieldId={field.id} pointing={pointing} />}
      {low && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Check this value — the AI isn’t sure
          </p>
          <Button variant="outline" className="min-h-touch bg-card" aria-label={`Confirm ${field.label}`} data-confirm onClick={onConfirm}>
            <Check aria-hidden="true" />
            Confirm
          </Button>
        </div>
      )}
    </div>
  )
}
