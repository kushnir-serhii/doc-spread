import { useRef, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/lib/mock/types'
import { FieldRow } from './field-row'
import { FieldSummary } from './field-summary'

interface FieldListProps {
  fields: FieldDef[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onAdd: () => void
}

export const FieldList = ({ fields, selectedId, onSelect, onMove, onAdd }: FieldListProps) => {
  const listRef = useRef<HTMLUListElement>(null)

  // A moved row can lose focus (a button disables at the end of the list); put it back on the row.
  const move = (id: string, direction: 'up' | 'down') => {
    onMove(id, direction)
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-field-select="${id}"]`)?.focus()
    })
  }

  const handleKeyDown = (event: KeyboardEvent, id: string) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    event.preventDefault()
    move(id, event.key === 'ArrowUp' ? 'up' : 'down')
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
          <li key={field.id} onKeyDown={(event) => handleKeyDown(event, field.id)}>
            <FieldRow
              field={field}
              selected={field.id === selectedId}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onSelect={() => onSelect(field.id)}
              onMove={(direction) => move(field.id, direction)}
            />
            {field.columns && field.columns.length > 0 && (
              <ul className="ml-6 divide-y border-l border-t bg-muted/30" aria-label={`${field.label} columns`}>
                {field.columns.map((column) => (
                  <li key={column.id} className="flex min-h-touch items-center gap-3 px-4 py-2 md:min-h-12">
                    <FieldSummary field={column} />
                  </li>
                ))}
              </ul>
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
