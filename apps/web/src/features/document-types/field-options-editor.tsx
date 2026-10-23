import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OptionRow {
  id: string
  value: string
}

interface FieldOptionsEditorProps {
  options: string[]
  onChange: (options: string[]) => void
}

const getOptionError = (row: OptionRow, rows: OptionRow[]) => {
  const value = row.value.trim().toLowerCase()
  if (value === '') return 'Option is empty.'
  if (rows.some((other) => other.id !== row.id && other.value.trim().toLowerCase() === value)) {
    return 'Duplicate option.'
  }
  return null
}

/** Rows get their own ids (options are plain strings). Mount it with a `key` per field. */
export const FieldOptionsEditor = ({ options, onChange }: FieldOptionsEditorProps) => {
  const groupId = useId()
  const [rows, setRows] = useState<OptionRow[]>(() => options.map((value) => ({ id: crypto.randomUUID(), value })))
  const [focusId, setFocusId] = useState<string | null>(null)

  const update = (next: OptionRow[]) => {
    setRows(next)
    onChange(next.map((row) => row.value))
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Options</legend>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No options yet. The AI picks one of the options you add.</p>
      )}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const error = getOptionError(row, rows)
          const inputId = `${groupId}-${row.id}`
          return (
            <li key={row.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={inputId} className="sr-only">
                  Option value
                </Label>
                <Input
                  id={inputId}
                  value={row.value}
                  autoFocus={row.id === focusId}
                  aria-invalid={error !== null}
                  aria-describedby={error ? `${inputId}-error` : undefined}
                  onChange={(event) =>
                    update(rows.map((r) => (r.id === row.id ? { ...r, value: event.target.value } : r)))
                  }
                  className="min-h-touch md:min-h-9"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-touch shrink-0 md:size-9"
                  aria-label={`Remove option ${row.value || '(empty)'}`}
                  onClick={() => update(rows.filter((r) => r.id !== row.id))}
                >
                  <X aria-hidden />
                </Button>
              </div>
              {error && (
                <p id={`${inputId}-error`} className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <Button
        variant="outline"
        className="min-h-touch self-start md:min-h-9"
        onClick={() => {
          const id = crypto.randomUUID()
          setFocusId(id)
          update([...rows, { id, value: '' }])
        }}
      >
        <Plus aria-hidden />
        Add option
      </Button>
    </fieldset>
  )
}
