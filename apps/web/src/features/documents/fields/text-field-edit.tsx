import { Input } from '@/components/ui/input'
import type { ExtractedValue } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

type TextLike = ExtractedValue<'text' | 'email' | 'phone' | 'tax_id'>

const INPUT_TYPES = { text: 'text', email: 'email', phone: 'tel', tax_id: 'text' } as const

/** text, email, phone and tax ID: a plain input; only the keyboard hint differs. */
export const TextFieldEdit = <V extends TextLike>({ id, value, onChange }: FieldEditProps<V>) => (
  <Input
    id={id}
    type={INPUT_TYPES[value.type]}
    className="min-h-touch"
    value={value.value ?? ''}
    onChange={(event) => onChange({ ...value, value: event.target.value })}
  />
)
