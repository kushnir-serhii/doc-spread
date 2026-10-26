import { AlertTriangle } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TableFieldView } from '@/features/documents/fields/table-field-view'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { TableSuggestion } from '@/lib/mock/types'

interface TableSuggestionFormProps {
  suggestion: TableSuggestion
  onAdd: (name: string) => void
  onCancel: () => void
}

/** The table name (editable), the guessed columns and a read-only preview of the first rows. */
export const TableSuggestionForm = ({ suggestion, onAdd, onCancel }: TableSuggestionFormProps) => {
  const nameId = useId()
  const columnsId = useId()
  const [name, setName] = useState(suggestion.label)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim() !== '') onAdd(name)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Table name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="min-h-touch md:min-h-9"
        />
      </div>
      <div className="flex flex-col gap-1">
        <p id={columnsId} className="text-sm font-medium">
          {suggestion.columns.length} {suggestion.columns.length === 1 ? 'column' : 'columns'} guessed from the header
        </p>
        <ul aria-labelledby={columnsId} className="flex flex-wrap gap-1.5 text-xs">
          {suggestion.columns.map((column) => (
            <li key={column.id} className="max-w-full truncate rounded-md border bg-muted px-2 py-1">
              {column.label} <span className="text-muted-foreground">· {FIELD_TYPE_META[column.type].label}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Rename, retype or remove columns in the editor after adding.</p>
      </div>
      {suggestion.warning && (
        <p role="alert" className="flex items-start gap-1.5 rounded-md bg-warning-soft p-2 text-sm text-warning-soft-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {suggestion.warning}
        </p>
      )}
      <TableFieldView
        label={`Preview of ${name || 'the table'}`}
        columns={suggestion.columns}
        value={suggestion.preview}
        focusId="table-suggestion-preview"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={name.trim() === ''} className="min-h-touch md:min-h-9">
          Add table
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-touch md:min-h-9">
          Cancel
        </Button>
      </div>
    </form>
  )
}
