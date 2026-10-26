import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { ExtractedValue } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

/** Keeps the typed text ("12.") apart from the parsed number; only a valid number, or empty, is reported. */
export const NumberFieldEdit = ({ id, value, onChange }: FieldEditProps<ExtractedValue<'number'>>) => {
  const [text, setText] = useState(value.value === null ? '' : String(value.value))
  return (
    <Input
      id={id}
      inputMode="decimal"
      className="min-h-touch tabular-nums"
      value={text}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        const parsed = Number(next.replace(',', '.'))
        if (next.trim() === '') onChange({ ...value, value: null })
        else if (Number.isFinite(parsed)) onChange({ ...value, value: parsed })
      }}
    />
  )
}
