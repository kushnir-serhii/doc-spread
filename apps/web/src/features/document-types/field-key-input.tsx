import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FieldKeyInputProps {
  value: string
  error: string | null
  onChange: (key: string) => void
}

export const FieldKeyInput = ({ value, error, onChange }: FieldKeyInputProps) => {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Key</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        spellCheck={false}
        autoComplete="off"
        className="min-h-touch font-mono md:min-h-9"
      />
      <p id={helpId} className="text-xs text-muted-foreground">
        The column name in exports. Follows the label until you edit it.
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
