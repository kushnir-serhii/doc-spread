import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import { FIELD_TYPES, type FieldDef, type FieldType } from '@/lib/mock/types'
import { getTypeChangeLoss } from './field-key'

interface FieldTypeSelectProps {
  field: FieldDef
  onChange: (type: FieldType) => void
}

/** Changing the type keeps label and hint. If data would be lost, it asks first. */
export const FieldTypeSelect = ({ field, onChange }: FieldTypeSelectProps) => {
  const id = useId()
  const [pending, setPending] = useState<FieldType | null>(null)
  const loss = pending === null ? null : getTypeChangeLoss(field, pending)

  const handleChange = (next: FieldType) => {
    if (getTypeChangeLoss(field, next) === null) {
      setPending(null)
      onChange(next)
    } else {
      setPending(next)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Type</Label>
      <select
        id={id}
        value={pending ?? field.type}
        onChange={(event) => {
          const next = FIELD_TYPES.find((type) => type === event.target.value)
          if (next) handleChange(next)
        }}
        className="min-h-touch w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-9 md:text-sm"
      >
        {FIELD_TYPES.map((type) => (
          <option key={type} value={type}>
            {FIELD_TYPE_META[type].label}
          </option>
        ))}
      </select>
      {pending !== null && loss !== null && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm">
            Change to {FIELD_TYPE_META[pending].label}? {loss}
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="min-h-touch md:min-h-9"
              onClick={() => {
                setPending(null)
                onChange(pending)
              }}
            >
              Change type
            </Button>
            <Button variant="outline" className="min-h-touch md:min-h-9" onClick={() => setPending(null)}>
              Keep {FIELD_TYPE_META[field.type].label}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
