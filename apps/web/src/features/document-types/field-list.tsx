import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/lib/mock/types'
import { ColumnList } from './column-list'
import type { Selection } from './editor-target'
import { fieldBadges } from './list-settings'
import { FieldRow } from './field-row'

interface FieldListProps {
  fields: FieldDef[]
  titleFieldId: string | null
  listColumnIds: string[]
  selection: Selection
  onSelect: (selection: NonNullable<Selection>) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onMoveColumn: (fieldId: string, columnId: string, direction: 'up' | 'down') => void
  onAdd: () => void
  onAddColumn: (fieldId: string) => void
}

export const FieldList = ({
  fields,
  titleFieldId,
  listColumnIds,
  selection,
  onSelect,
  onMove,
  onMoveColumn,
  onAdd,
  onAddColumn,
}: FieldListProps) => {
  const listRef = useRef<HTMLUListElement>(null)

  // A moved row can lose focus (a button disables at the end of the list); put it back on the row.
  const moveAndRefocus = (id: string, move: () => void) => {
    move()
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-field-select="${id}"]`)?.focus()
    })
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <div>
          <p className="font-medium">No fields yet</p>
          <p className="text-sm text-muted-foreground">
            Fields are the data DocSpread reads from every document of this type, like a date or a total.
          </p>
        </div>
        <Button onClick={onAdd} className="min-h-touch md:min-h-9">
          <Plus aria-hidden />
          Add field
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Select a field to edit it. Reorder with the arrow buttons or{' '}
        <kbd className="rounded border bg-muted px-1 font-mono">Alt</kbd> +{' '}
        <kbd className="rounded border bg-muted px-1 font-mono">↑</kbd>/
        <kbd className="rounded border bg-muted px-1 font-mono">↓</kbd> on a focused field.
      </p>
      <ul ref={listRef} className="divide-y rounded-lg border bg-card">
        {fields.map((field, index) => (
          <li key={field.id}>
            <FieldRow
              field={field}
              badges={fieldBadges(field, titleFieldId, listColumnIds)}
              selected={selection?.kind === 'field' && selection.fieldId === field.id}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onSelect={() => onSelect({ kind: 'field', fieldId: field.id })}
              onMove={(direction) => moveAndRefocus(field.id, () => onMove(field.id, direction))}
            />
            {field.type === 'table' && (
              <ColumnList
                table={field}
                selectedColumnId={
                  selection?.kind === 'column' && selection.fieldId === field.id ? selection.columnId : null
                }
                onSelect={(columnId) => onSelect({ kind: 'column', fieldId: field.id, columnId })}
                onMove={(columnId, direction) =>
                  moveAndRefocus(columnId, () => onMoveColumn(field.id, columnId, direction))
                }
                onAdd={() => onAddColumn(field.id)}
              />
            )}
          </li>
        ))}
      </ul>
      <Button variant="outline" onClick={onAdd} className="min-h-touch self-start md:min-h-9">
        <Plus aria-hidden />
        Add field
      </Button>
    </div>
  )
}
