import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ExtractedValue } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

export const SelectFieldEdit = ({ id, field, value, onChange }: FieldEditProps<ExtractedValue<'select'>>) => {
  const options = field.options ?? []
  // a value that is no longer an option (older type version) is still shown
  const shown = value.value !== null && !options.includes(value.value) ? [value.value, ...options] : options
  return (
    <Select value={value.value ?? ''} onValueChange={(next) => onChange({ ...value, value: next })}>
      <SelectTrigger id={id} className="min-h-touch w-full">
        <SelectValue placeholder="Choose…" />
      </SelectTrigger>
      <SelectContent>
        {shown.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
