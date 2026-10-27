import type { ComponentProps } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ColumnDef, TableValue } from '@/lib/mock/types'
import type { RowFailures } from './row-failures'
import { TableGrid } from './table-grid'
import { TableList } from './table-list'
import { TableViewToggle } from './table-view-toggle'
import { addRow, confirmTable, hasLowCell, removeRow, setCell } from './table-value-ops'
import { useTableViewMode } from './use-table-view-mode'

export interface TableFieldViewProps {
  /** accessible name of the table */
  label: string
  columns: ColumnDef[]
  value: TableValue
  /** id of the field's box in the viewer; cells get `cellFocusId(focusId, rowId, columnId)` */
  focusId: string
  /** set to make the table editable (cells, add and remove rows); omit for read-only */
  onChange?: (next: TableValue) => void
  /** columns whose cells are calculated: shown read-only with a "computed" marker */
  computedColumnIds?: ReadonlySet<string>
  /** why a computed cell has no value (shown as "—"); `null` when it has one */
  computedFailure?: (rowId: string, columnId: string) => string | null
  /** rows a failed check fails in, with the columns it reads there: those cells get the warning ring */
  failedRows?: RowFailures
}

type ViewProps = ComponentProps<typeof TableGrid>

/**
 * The shared table field: "Table" (grid) or "List" (a card per row), chosen by viewport and remembered by the browser.
 * Read-only unless `onChange` is given. Reused by Review and by the document type preview.
 */
export const TableFieldView = ({ label, columns, value, focusId, onChange, computedColumnIds, computedFailure, failedRows }: TableFieldViewProps) => {
  const { mode, setMode } = useTableViewMode()
  const view: ViewProps = {
    label,
    columns,
    value,
    focusId,
    computedColumnIds,
    computedFailure,
    failedRows,
    onCellChange: onChange && ((rowId, columnId, next) => onChange(setCell(value, rowId, columnId, next))),
    onAddRow: onChange && (() => onChange(addRow(value, columns))),
    onRemoveRow: onChange && ((rowId: string) => onChange(removeRow(value, rowId))),
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {value.rows.length} {value.rows.length === 1 ? 'row' : 'rows'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onChange && hasLowCell(value) && (
            <Button type="button" variant="outline" className="min-h-touch" data-confirm onClick={() => onChange(confirmTable(value))}>
              <Check aria-hidden="true" />
              Confirm table
            </Button>
          )}
          <TableViewToggle mode={mode} onChange={setMode} />
        </div>
      </div>
      {mode === 'table' ? <TableGrid {...view} /> : <TableList {...view} />}
    </div>
  )
}
