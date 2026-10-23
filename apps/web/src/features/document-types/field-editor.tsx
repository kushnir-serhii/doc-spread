import { useId, type ReactNode } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ColumnDef, FieldDef, FieldType } from '@/lib/mock/types'
import { FieldKeyInput } from './field-key-input'
import { FieldOptionsEditor } from './field-options-editor'
import { FieldTypeSelect } from './field-type-select'
import type { FieldPatch } from './type-draft'

interface FieldEditorProps {
  field: FieldDef | ColumnDef
  /** The types on offer: a column can be anything but a table. */
  types: readonly FieldType[]
  /** Small line above the form, e.g. which table a column belongs to. */
  heading?: string
  keyError: string | null
  deleteLabel: string
  onLabelChange: (label: string) => void
  onKeyChange: (key: string) => void
  onPatch: (patch: FieldPatch) => void
  onTypeChange: (type: FieldType) => void
  onDuplicate: () => void
  onDelete: () => void
  /** Settings only this kind of field has, shown after the type. */
  children?: ReactNode
}

/** Edits a field or a table column. Mount with a `key` per item: the options rows and a pending type change are local. */
export const FieldEditor = ({
  field,
  types,
  heading,
  keyError,
  deleteLabel,
  onLabelChange,
  onKeyChange,
  onPatch,
  onTypeChange,
  onDuplicate,
  onDelete,
  children,
}: FieldEditorProps) => {
  const id = useId()
  const hintHelpId = `${id}-hint-help`

  return (
    <div className="flex flex-col gap-5">
      {heading && <p className="truncate text-sm font-medium text-muted-foreground" title={heading}>{heading}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-label`}>Label</Label>
        <Input
          id={`${id}-label`}
          value={field.label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
      </div>

      <FieldKeyInput
        value={field.key}
        error={keyError}
        onChange={onKeyChange}
      />

      <FieldTypeSelect field={field} types={types} onChange={onTypeChange} />

      {field.type === 'select' && (
        <FieldOptionsEditor
          options={field.options ?? []}
          onChange={(options) => onPatch({ options })}
        />
      )}

      {children}

      <label htmlFor={`${id}-required`} className="flex min-h-touch items-center gap-3 text-sm font-medium md:min-h-9">
        <input
          id={`${id}-required`}
          type="checkbox"
          checked={field.required}
          onChange={(event) => onPatch({ required: event.target.checked })}
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
          onChange={(event) => onPatch({ hint: event.target.value || undefined })}
        />
        <p id={hintHelpId} className="text-xs text-muted-foreground">
          Say where to look or what to ignore. Good: “The date the invoice was issued, not the sale date.”
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" className="min-h-touch md:min-h-9" onClick={onDuplicate}>
          <Copy aria-hidden />
          Duplicate
        </Button>
        <Button variant="outline" className="min-h-touch md:min-h-9" onClick={onDelete}>
          <Trash2 aria-hidden />
          {deleteLabel}
        </Button>
      </div>
    </div>
  )
}
