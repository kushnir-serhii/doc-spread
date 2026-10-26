import { Input } from '@/components/ui/input'
import type { ExtractedValue } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

/** Native date picker; the value is an ISO date (YYYY-MM-DD). */
export const DateInput = ({ id, value, onChange }: FieldEditProps<ExtractedValue<'date'>>) => (
  <Input
    id={id}
    type="date"
    className="min-h-touch"
    value={value.value?.slice(0, 10) ?? ''}
    onChange={(event) => onChange({ ...value, value: event.target.value || null })}
  />
)
