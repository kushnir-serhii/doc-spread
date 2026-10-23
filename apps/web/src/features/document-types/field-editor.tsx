import { useId, type Dispatch } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { FieldDef } from '@/lib/mock/types'
import { FieldKeyInput } from './field-key-input'
import { getKeyError } from './field-key'
import { FieldOptionsEditor } from './field-options-editor'
import { FieldTypeSelect } from './field-type-select'
import type { BuilderAction } from './type-draft-reducer'

interface FieldEditorProps {
  field: FieldDef
  fields: FieldDef[]
  dispatch: Dispatch<BuilderAction>
  /** Called after the field is duplicated, with the copy's id. */
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

/** Mount with a `key` per field: the options rows and a pending type change are local to it. */
export const FieldEditor = ({ field, fields, dispatch, onDuplicate, onDelete }: FieldEditorProps) => {
  const id = useId()
  const hintHelpId = `${id}-hint-help`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-label`}>Label</Label>
        <Input
          id={`${id}-label`}
          value={field.label}
          onChange={(event) => dispatch({ type: 'setFieldLabel', id: field.id, label: event.target.value })}
          className="min-h-touch md:min-h-9"
        />
      </div>

      <FieldKeyInput
        value={field.key}
        error={getKeyError(field, fields)}
        onChange={(key) => dispatch({ type: 'setFieldKey', id: field.id, key })}
      />

      <FieldTypeSelect
        field={field}
        onChange={(fieldType) => dispatch({ type: 'changeFieldType', id: field.id, fieldType })}
      />

      {field.type === 'select' && (
        <FieldOptionsEditor
          options={field.options ?? []}
          onChange={(options) => dispatch({ type: 'updateField', id: field.id, patch: { options } })}
        />
      )}

      <label htmlFor={`${id}-required`} className="flex min-h-touch items-center gap-3 text-sm font-medium md:min-h-9">
        <input
          id={`${id}-required`}
          type="checkbox"
          checked={field.required}
          onChange={(event) =>
            dispatch({ type: 'updateField', id: field.id, patch: { required: event.target.checked } })
          }
          className="size-5 accent-primary"
        />
        Required
      </label>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-hint`}>Hint for the AI</Label>
        <Textarea
          id={`${id}-hint`}
          value={field.hint ?? ''}
          aria-describedby={hintHelpId}
          onChange={(event) =>
            dispatch({ type: 'updateField', id: field.id, patch: { hint: event.target.value || undefined } })
          }
        />
        <p id={hintHelpId} className="text-xs text-muted-foreground">
          Say where to look or what to ignore. Good: “The date the invoice was issued, not the sale date.”
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" className="min-h-touch md:min-h-9" onClick={() => onDuplicate(field.id)}>
          <Copy aria-hidden />
          Duplicate
        </Button>
        <Button variant="outline" className="min-h-touch md:min-h-9" onClick={() => onDelete(field.id)}>
          <Trash2 aria-hidden />
          Delete field
        </Button>
      </div>
    </div>
  )
}
