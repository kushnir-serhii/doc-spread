import { useId } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import { isLowConfidence } from '@/lib/fields/confidence'
import type { ColumnDef, TableValue } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { ComputedMark } from './computed-mark'
import { cellFocusId } from './field-focus-ids'
import { FieldValueEdit } from './field-value-edit'
import { TableRemoveRowButton } from './table-remove-row-button'
import { cellOf, isCell, type CellChange } from './table-value-ops'

interface TableListCardProps {
  columns: ColumnDef[]
  row: TableValue['rows'][number]
  /** 0-based */
  index: number
  focusId: string
  computedColumnIds?: ReadonlySet<string>
  computedFailure?: (rowId: string, columnId: string) => string | null
  onCellChange?: CellChange
  onRemove?: () => void
}

/** The "List" view: one row as a card, a label and a value (or input) per column. */
export const TableListCard = ({
  columns,
  row,
  index,
  focusId,
  computedColumnIds,
  computedFailure,
  onCellChange,
  onRemove,
}: TableListCardProps) => {
  const base = useId()
  return (
    <li className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Row {index + 1}</h4>
        {onRemove && <TableRemoveRowButton number={index + 1} onClick={onRemove} />}
      </div>
      {columns.map((column) => {
        const cell = cellOf(row, column)
        const inputId = `${base}-${column.id}`
        const computed = computedColumnIds?.has(column.id) ?? false
        const failure = computed ? (computedFailure?.(row.id, column.id) ?? null) : null
        const edit = onCellChange !== undefined && !computed
        const low = edit && isLowConfidence(cell.confidence)
        return (
          <div
            key={column.id}
            data-focus-id={cellFocusId(focusId, row.id, column.id)}
            tabIndex={edit ? undefined : 0}
            className={cn(
              'flex flex-col gap-1 rounded-md p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              low && 'bg-confidence-low-bg [&_input]:bg-card',
            )}
          >
            <Label htmlFor={edit ? inputId : undefined} className="gap-1.5 text-xs text-muted-foreground">
              {low && <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />}
              {column.label}
              {computed && <ComputedMark />}
              {low && <span className="sr-only"> (check this value)</span>}
            </Label>
            {edit ? (
              <FieldValueEdit
                id={inputId}
                field={column}
                value={cell}
                onChange={(next) => {
                  if (isCell(next)) onCellChange(row.id, column.id, next)
                }}
              />
            ) : (
              <p
                title={failure ?? undefined}
                className={cn('text-sm font-medium break-words', (failure || cell.value === null) && 'text-muted-foreground', !failure && cell.value === null && 'italic')}
              >
                {failure ? '—' : cell.value === null ? 'Not found' : formatFieldValue(cell)}
                {failure && <span className="sr-only">{failure}</span>}
              </p>
            )}
          </div>
        )
      })}
    </li>
  )
}
