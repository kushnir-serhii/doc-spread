import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ColumnDef, FieldDef } from '@/lib/mock/types'
import type { FieldPatch } from './type-draft'

interface FieldExtractionSettingsProps {
  field: FieldDef | ColumnDef
  onPatch: (patch: FieldPatch) => void
}

/** What only an extracted field has: whether it is required, and the hint for the AI. */
export const FieldExtractionSettings = ({ field, onPatch }: FieldExtractionSettingsProps) => {
  const id = useId()
  const hintHelpId = `${id}-hint-help`
  return (
    <>
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
    </>
  )
}
