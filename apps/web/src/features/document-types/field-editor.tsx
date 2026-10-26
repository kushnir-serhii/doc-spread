import { useId, type ReactNode } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ColumnDef, FieldDef, FieldType } from '@/lib/mock/types'
import { FieldExtractionSettings } from './field-extraction-settings'
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
  /** Shown after a failed Save. */
  labelError?: string | null
  /** Other problems of this item (options, columns, title/list rules); shown after a failed Save. */
  errors?: string[]
  deleteLabel: string
  onLabelChange: (label: string) => void
  onKeyChange: (key: string) => void
  onPatch: (patch: FieldPatch) => void
  onTypeChange: (type: FieldType) => void
  onDuplicate: () => void
  onDelete: () => void
  /** Set for a computed field: it is calculated, so hint and required don't apply. */
  computedBy?: { text: string; onOpen?: () => void }
  /** Settings only this kind of field has, shown after the type. */
  children?: ReactNode
}

/** Edits a field or a table column. Mount with a `key` per item: the options rows and a pending type change are local. */
export const FieldEditor = ({
  field,
  types,
  heading,
  keyError,
  labelError = null,
  errors = [],
  deleteLabel,
  onLabelChange,
  onKeyChange,
  onPatch,
  onTypeChange,
  onDuplicate,
  onDelete,
  computedBy,
  children,
}: FieldEditorProps) => {
  const id = useId()

  return (
    <div data-field-editor tabIndex={-1} className="flex flex-col gap-5 outline-none">
      {heading && <p className="truncate text-sm font-medium text-muted-foreground" title={heading}>{heading}</p>}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-label`}>Label</Label>
        <Input
          id={`${id}-label`}
          value={field.label}
          data-part="label"
          aria-invalid={labelError !== null}
          aria-describedby={labelError ? `${id}-label-error` : undefined}
          onChange={(event) => onLabelChange(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        {labelError && (
          <p id={`${id}-label-error`} className="text-xs text-destructive">
            {labelError}
          </p>
        )}
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

      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-destructive">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {computedBy ? (
        <div className="flex flex-col items-start gap-2 rounded-md bg-muted p-3 text-sm">
          <p>
            Computed by <span className="font-medium">{computedBy.text}</span>. It is calculated in Review, never read
            from the document.
          </p>
          {computedBy.onOpen && (
            <Button variant="outline" className="min-h-touch md:min-h-9" onClick={computedBy.onOpen}>
              Open the action
            </Button>
          )}
        </div>
      ) : (
        <FieldExtractionSettings field={field} onPatch={onPatch} />
      )}

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
