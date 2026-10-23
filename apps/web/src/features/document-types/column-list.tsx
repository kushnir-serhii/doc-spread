import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/lib/mock/types'
import { FieldRow } from './field-row'

interface ColumnListProps {
  table: FieldDef
  selectedColumnId: string | null
  invalidIds: ReadonlySet<string>
  onSelect: (columnId: string) => void
  onMove: (columnId: string, direction: 'up' | 'down') => void
  onAdd: () => void
}

/** The columns of one table field, indented under its row. Columns only move within their table. */
export const ColumnList = ({ table, selectedColumnId, invalidIds, onSelect, onMove, onAdd }: ColumnListProps) => {
  const columns = table.columns ?? []
  return (
    <div className="ml-6 border-l border-t bg-muted/30">
      {columns.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No columns yet</p>
      ) : (
        <ul className="divide-y" aria-label={`${table.label} columns`}>
          {columns.map((column, index) => (
            <li key={column.id}>
              <FieldRow
                field={column}
                selected={column.id === selectedColumnId}
                invalid={invalidIds.has(column.id)}
                isFirst={index === 0}
                isLast={index === columns.length - 1}
                onSelect={() => onSelect(column.id)}
                onMove={(direction) => onMove(column.id, direction)}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="border-t px-2 py-1">
        <Button variant="ghost" className="min-h-touch md:min-h-9" onClick={onAdd}>
          <Plus aria-hidden />
          Add column
          <span className="sr-only"> to {table.label}</span>
        </Button>
      </div>
    </div>
  )
}
