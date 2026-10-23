import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { ColumnDef, TableValue } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { cellFocusId } from './field-focus-ids'
import type { FieldViewProps } from './field-types'

const isAmount = (column: ColumnDef) => column.type === 'money' || column.type === 'number'

/** Read-only line items: contained scroll, sticky header, amounts right-aligned. Editing rows comes in slice 4. */
export const FieldTable = ({ field, value, focusId }: FieldViewProps<TableValue>) => {
  const columns = field.columns ?? []
  if (value.rows.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Not found</p>
  }
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${field.label}, ${value.rows.length} rows`}
      className="max-h-96 overflow-auto rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn('px-3 py-2 text-left font-medium whitespace-nowrap', isAmount(column) && 'text-right')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.rows.map((row) => (
            <tr key={row.id} className="border-t">
              {columns.map((column) => {
                const cell = row.cells[column.id]
                const empty = !cell || cell.value === null
                const text = empty ? 'Not found' : formatFieldValue(cell)
                return (
                  <td
                    key={column.id}
                    tabIndex={-1}
                    data-focus-id={cellFocusId(focusId, row.id, column.id)}
                    title={text}
                    className={cn(
                      'max-w-48 truncate px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      isAmount(column) && 'text-right tabular-nums',
                      empty && 'text-muted-foreground italic',
                    )}
                  >
                    {text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
