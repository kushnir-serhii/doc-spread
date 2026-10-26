import { useEffect, useId, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import { isLowConfidence } from '@/lib/fields/confidence'
import type { AnyExtractedValue, ColumnDef } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { FieldValueEdit } from './field-value-edit'
import { isAmountColumn, isCell } from './table-value-ops'
import type { GridNavigation, GridPos } from './use-grid-navigation'

interface TableGridCellProps {
  column: ColumnDef
  cell: AnyExtractedValue
  pos: GridPos
  focusId: string
  nav: GridNavigation
  /** set when cells can be edited */
  onChange?: (next: AnyExtractedValue) => void
}

/** Shows the formatted value; switches to the field's own input on Enter, F2, double-click or typing. */
export const TableGridCell = ({ column, cell, pos, focusId, nav, onChange }: TableGridCellProps) => {
  const inputId = useId()
  const ref = useRef<HTMLTableCellElement>(null)
  const isActive = nav.active.row === pos.row && nav.active.col === pos.col
  const isEditing = nav.editing?.row === pos.row && nav.editing.col === pos.col
  const empty = cell.value === null
  const text = empty ? 'Not found' : formatFieldValue(cell)
  const low = onChange !== undefined && isLowConfidence(cell.confidence)

  // DOM focus: the input that replaces the text takes focus (and selects, so typing replaces)
  useEffect(() => {
    if (!isEditing) return
    const control = ref.current?.querySelector<HTMLElement>('input, [role="combobox"], [role="switch"]')
    control?.focus()
    if (control instanceof HTMLInputElement) control.select()
  }, [isEditing])

  return (
    <td
      ref={ref}
      role="gridcell"
      tabIndex={isActive ? 0 : -1}
      data-pos={`${pos.row}:${pos.col}`}
      data-focus-id={focusId}
      title={isEditing ? undefined : text}
      onFocus={() => nav.onCellFocus(pos)}
      onKeyDown={(event) => nav.onCellKeyDown(event, pos)}
      onDoubleClick={onChange && (() => nav.setEditing(pos))}
      className={cn(
        'max-w-48 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        isEditing && 'min-w-56',
        low && 'bg-confidence-low-bg',
      )}
    >
      {isEditing && onChange ? (
        <FieldValueEdit
          id={inputId}
          field={column}
          value={cell}
          onChange={(next) => {
            if (isCell(next)) onChange(next)
          }}
        />
      ) : (
        <span className={cn('flex items-center gap-1.5', isAmountColumn(column) && 'justify-end tabular-nums')}>
          {low && (
            <>
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Check this value: </span>
            </>
          )}
          <span className={cn('min-w-0 truncate', empty && 'text-muted-foreground italic')}>{text}</span>
        </span>
      )}
    </td>
  )
}
