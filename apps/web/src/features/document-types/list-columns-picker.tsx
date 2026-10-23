import { useId } from 'react'
import type { FieldDef } from '@/lib/mock/types'
import { ListColumnOrder } from './list-column-order'
import { MAX_LIST_COLUMNS } from './list-settings'

interface ListColumnsPickerProps {
  fields: FieldDef[]
  titleFieldId: string | null
  listColumnIds: string[]
  onToggle: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
}

export const ListColumnsPicker = ({ fields, titleFieldId, listColumnIds, onToggle, onMove }: ListColumnsPickerProps) => {
  const id = useId()
  const full = listColumnIds.length >= MAX_LIST_COLUMNS
  const chosen = listColumnIds.flatMap((columnId) => fields.find((f) => f.id === columnId) ?? [])

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">
        List columns{' '}
        <span className="font-normal text-muted-foreground" aria-live="polite">
          {listColumnIds.length} of {MAX_LIST_COLUMNS}
        </span>
      </legend>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add fields to choose which ones the Inbox shows.</p>
      ) : (
        <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => {
            const checked = listColumnIds.includes(field.id)
            const disabled = full && !checked
            return (
              <li key={field.id}>
                <label
                  htmlFor={`${id}-${field.id}`}
                  className="flex min-h-touch items-center gap-3 text-sm md:min-h-9"
                >
                  <input
                    id={`${id}-${field.id}`}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(field.id)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 truncate" title={field.label}>
                    {field.label || 'Untitled field'}
                  </span>
                  {disabled && <span className="shrink-0 text-xs text-muted-foreground">Limit reached</span>}
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {full
          ? `The Inbox shows up to ${MAX_LIST_COLUMNS} columns. Uncheck one to pick another.`
          : `Pick up to ${MAX_LIST_COLUMNS}. The order below is the column order in the Inbox.`}
      </p>
      {chosen.length > 0 && <ListColumnOrder columns={chosen} titleFieldId={titleFieldId} onMove={onMove} />}
    </fieldset>
  )
}
