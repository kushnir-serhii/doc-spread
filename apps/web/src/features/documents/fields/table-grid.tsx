import { useRef } from 'react'
import type { ColumnDef, TableValue } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { TableAddRowButton } from './table-add-row-button'
import { TableGridRow } from './table-grid-row'
import { isAmountColumn, type CellChange } from './table-value-ops'
import { useGridNavigation } from './use-grid-navigation'

interface TableGridProps {
  label: string
  columns: ColumnDef[]
  value: TableValue
  focusId: string
  /** the editing callbacks are set together, only when the table is editable */
  onCellChange?: CellChange
  onAddRow?: () => void
  onRemoveRow?: (rowId: string) => void
}

/** The "Table" view: a spreadsheet-like grid. Contained scroll and a sticky header keep 50+ rows usable. */
export const TableGrid = ({ label, columns, value, focusId, onCellChange, onAddRow, onRemoveRow }: TableGridProps) => {
  const rowCount = value.rows.length
  const { gridRef, nav } = useGridNavigation({
    rowCount,
    dataColCount: columns.length,
    hasActionCol: onRemoveRow !== undefined,
    editable: onCellChange !== undefined,
  })
  const addRef = useRef<HTMLButtonElement>(null)
  const remove = (rowId: string, index: number) => {
    onRemoveRow?.(rowId)
    if (rowCount > 1) nav.focusCellSoon({ row: Math.min(index, rowCount - 2), col: columns.length })
    // the last row is gone: "Add row" is the next useful place for focus
    else requestAnimationFrame(() => addRef.current?.focus())
  }
  const add = () => {
    onAddRow?.()
    nav.focusCellSoon({ row: rowCount, col: 0 })
  }
  return (
    <>
      {rowCount === 0 ? (
        <p className="text-sm text-muted-foreground italic">{onAddRow ? 'No rows yet' : 'Not found'}</p>
      ) : (
        <div className="max-h-table-scroll overflow-auto rounded-md border">
          <table
            ref={gridRef}
            role="grid"
            aria-label={label}
            aria-rowcount={rowCount + 1}
            className="w-full text-sm"
          >
            <thead className="sticky top-0 z-10 bg-muted">
              <tr role="row" aria-rowindex={1}>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    role="columnheader"
                    scope="col"
                    className={cn('px-3 py-2 text-left font-medium whitespace-nowrap', isAmountColumn(column) && 'text-right')}
                  >
                    {column.label}
                  </th>
                ))}
                {onRemoveRow && (
                  <th role="columnheader" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {value.rows.map((row, index) => (
                <TableGridRow
                  key={row.id}
                  columns={columns}
                  row={row}
                  index={index}
                  focusId={focusId}
                  nav={nav}
                  onCellChange={onCellChange}
                  onRemove={onRemoveRow && remove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onAddRow && <TableAddRowButton ref={addRef} onClick={add} />}
    </>
  )
}
