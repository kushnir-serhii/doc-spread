import { useId } from 'react'
import { Label } from '@/components/ui/label'
import type { FieldDef } from '@/lib/mock/types'
import { canBeTitle } from './list-settings'

interface TitleFieldSelectProps {
  fields: FieldDef[]
  value: string | null
  onChange: (id: string | null) => void
}

export const TitleFieldSelect = ({ fields, value, onChange }: TitleFieldSelectProps) => {
  const id = useId()
  const helpId = `${id}-help`
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Title field</Label>
      <select
        id={id}
        value={value ?? ''}
        aria-describedby={helpId}
        onChange={(event) => onChange(event.target.value || null)}
        className="min-h-touch w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-9 md:text-sm"
      >
        <option value="">File name (default)</option>
        {fields
          .filter((f) => canBeTitle(f.type))
          .map((f) => (
            <option key={f.id} value={f.id}>
              {f.label || 'Untitled field'}
            </option>
          ))}
      </select>
      <p id={helpId} className="text-xs text-muted-foreground">
        Shown as the document&apos;s name in the Inbox and in Review.
      </p>
    </div>
  )
}
