import type { ColumnDef, TableValue } from '@/lib/mock/types'
import type { RowFailures } from './row-failures'
import { TableAddRowButton } from './table-add-row-button'
import { TableListCard } from './table-list-card'
import type { CellChange } from './table-value-ops'

interface TableListProps {
  label: string
  columns: ColumnDef[]
  value: TableValue
  focusId: string
  computedColumnIds?: ReadonlySet<string>
  computedFailure?: (rowId: string, columnId: string) => string | null
  failedRows?: RowFailures
  onCellChange?: CellChange
  onAddRow?: () => void
  onRemoveRow?: (rowId: string) => void
}

/** The "List" view: a card per row, with a contained scroll for 50+ rows. */
export const TableList = ({
  label,
  columns,
  value,
  focusId,
  computedColumnIds,
  computedFailure,
  failedRows,
  onCellChange,
  onAddRow,
  onRemoveRow,
}: TableListProps) => (
  <>
    {value.rows.length === 0 ? (
      <p className="text-sm text-muted-foreground italic">{onAddRow ? 'No rows yet' : 'Not found'}</p>
    ) : (
      <ul aria-label={label} className="flex max-h-table-scroll flex-col gap-2 overflow-auto">
        {value.rows.map((row, index) => (
          <TableListCard
            key={row.id}
            columns={columns}
            row={row}
            index={index}
            focusId={focusId}
            computedColumnIds={computedColumnIds}
            computedFailure={computedFailure}
            failedColumnIds={failedRows?.get(row.id)}
            onCellChange={onCellChange}
            onRemove={onRemoveRow && (() => onRemoveRow(row.id))}
          />
        ))}
      </ul>
    )}
    {onAddRow && <TableAddRowButton onClick={onAddRow} />}
  </>
)
