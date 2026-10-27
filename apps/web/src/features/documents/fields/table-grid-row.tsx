import type { ColumnDef, TableValue } from '@/lib/mock/types'
import { cellFocusId } from './field-focus-ids'
import { TableGridCell } from './table-grid-cell'
import { TableRemoveRowButton } from './table-remove-row-button'
import { cellOf, type CellChange } from './table-value-ops'
import type { GridNavigation } from './use-grid-navigation'

interface TableGridRowProps {
  columns: ColumnDef[]
  row: TableValue['rows'][number]
  index: number
  focusId: string
  computedColumnIds?: ReadonlySet<string>
  computedFailure?: (rowId: string, columnId: string) => string | null
  nav: GridNavigation
  onCellChange?: CellChange
  onRemove?: (rowId: string, index: number) => void
}

export const TableGridRow = ({
  columns,
  row,
  index,
  focusId,
  computedColumnIds,
  computedFailure,
  nav,
  onCellChange,
  onRemove,
}: TableGridRowProps) => {
  const actionCol = columns.length
  const actionActive = nav.active.row === index && nav.active.col === actionCol
  return (
    <tr role="row" aria-rowindex={index + 2} className="border-t">
      {columns.map((column, col) => (
        <TableGridCell
          key={column.id}
          column={column}
          cell={cellOf(row, column)}
          pos={{ row: index, col }}
          focusId={cellFocusId(focusId, row.id, column.id)}
          nav={nav}
          computed={computedColumnIds?.has(column.id) ?? false}
          failure={computedFailure?.(row.id, column.id) ?? null}
          onChange={onCellChange && !computedColumnIds?.has(column.id) ? (next) => onCellChange(row.id, column.id, next) : undefined}
        />
      ))}
      {onRemove && (
        <td
          role="gridcell"
          className="w-px px-1 py-0.5"
          onFocus={() => nav.onCellFocus({ row: index, col: actionCol })}
          onKeyDown={(event) => nav.onCellKeyDown(event, { row: index, col: actionCol })}
        >
          {/* the button itself is the cell's focus target */}
          <TableRemoveRowButton
            number={index + 1}
            data-pos={`${index}:${actionCol}`}
            tabIndex={actionActive ? 0 : -1}
            onClick={() => onRemove(row.id, index)}
          />
        </td>
      )}
    </tr>
  )
}
