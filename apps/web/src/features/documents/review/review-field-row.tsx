import { useId } from 'react'
import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { FieldValueView } from '@/features/documents/fields/field-value-view'
import type { FieldDef, FieldValue } from '@/lib/mock/types'

interface ReviewFieldRowProps {
  field: FieldDef
  value: FieldValue
  focusId: string
}

/** A table has no confidence of its own: show its weakest cell, or nothing for an empty table. */
const confidenceOf = (value: FieldValue): number | null => {
  if (value.type !== 'table') return value.confidence
  const scores = value.rows.flatMap((row) => Object.values(row.cells).map((cell) => cell.confidence))
  return scores.length === 0 ? null : Math.min(...scores)
}

export const ReviewFieldRow = ({ field, value, focusId }: ReviewFieldRowProps) => {
  const labelId = useId()
  const isTable = value.type === 'table'
  const score = confidenceOf(value)
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      // a table holds its own focus targets (cells, scroll region); a scalar row is the target itself
      tabIndex={isTable ? undefined : 0}
      data-focus-id={isTable ? undefined : focusId}
      className="flex flex-col gap-1.5 rounded-md border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span id={labelId} className="min-w-0 text-sm font-medium text-muted-foreground">
          {field.label}
          {field.required && (
            <>
              <span aria-hidden="true"> *</span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </span>
        {score !== null && <ConfidenceBadge score={score} />}
      </div>
      <FieldValueView field={field} value={value} focusId={focusId} />
    </div>
  )
}
