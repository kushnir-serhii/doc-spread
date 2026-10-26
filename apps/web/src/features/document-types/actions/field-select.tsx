import type { FieldDef } from '@/lib/mock/types'
import { fieldsForSlot, type Allowed } from './expr-typing'
import { SlotSelect } from './slot-select'

interface FieldSelectProps {
  label: string
  fields: readonly FieldDef[]
  allowed: Allowed
  /** '' = none chosen */
  value: string
  onChange: (fieldId: string) => void
}

/** Offers the scalar fields whose type fits; a chosen field that no longer fits stays listed so it isn't dropped silently. */
export const FieldSelect = ({ label, fields, allowed, value, onChange }: FieldSelectProps) => {
  const options = fieldsForSlot(fields, allowed)
  const current = fields.find((f) => f.id === value)
  const stale = current && !options.some((f) => f.id === current.id)
  return (
    <SlotSelect
      aria-label={`${label}: field`}
      value={value}
      aria-invalid={value !== '' && (!current || stale) ? true : undefined}
      onChange={(event) => onChange(event.target.value)}
      className="flex-1"
    >
      <option value="">Choose a field…</option>
      {value !== '' && !current && <option value={value}>(deleted field)</option>}
      {stale && <option value={current.id}>{current.label || 'Untitled field'} (type doesn’t fit)</option>}
      {options.map((field) => (
        <option key={field.id} value={field.id}>
          {field.label || 'Untitled field'}
        </option>
      ))}
    </SlotSelect>
  )
}
