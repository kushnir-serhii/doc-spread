import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FIELD_TYPES, type FieldSuggestion } from '@/lib/mock/types'
import { isScalarFieldType } from '../field-key'
import { FieldTypeSelect } from '../field-type-select'
import type { SuggestionEdits } from './use-point-to-add'

const SCALAR_TYPES = FIELD_TYPES.filter(isScalarFieldType)

interface SuggestionFormProps {
  suggestion: FieldSuggestion
  onAdd: (edits: SuggestionEdits) => void
  onCancel: () => void
}

/** The guessed label, type and hint, all editable. */
export const SuggestionForm = ({ suggestion, onAdd, onCancel }: SuggestionFormProps) => {
  const labelId = useId()
  const hintId = useId()
  const [label, setLabel] = useState(suggestion.label)
  const [type, setType] = useState(suggestion.type)
  const [hint, setHint] = useState(suggestion.hint)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (label.trim() !== '') onAdd({ label, type, hint })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          className="min-h-touch md:min-h-9"
        />
      </div>
      <FieldTypeSelect
        field={{ type }}
        types={SCALAR_TYPES}
        onChange={(next) => {
          if (isScalarFieldType(next)) setType(next)
        }}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={hintId}>Hint for the AI</Label>
        <Textarea id={hintId} value={hint} onChange={(e) => setHint(e.target.value)} rows={2} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={label.trim() === ''} className="min-h-touch md:min-h-9">
          Add field
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="min-h-touch md:min-h-9">
          Cancel
        </Button>
      </div>
    </form>
  )
}
