import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CURRENCIES, type CurrencyCode, type ExtractedValue, type Money } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

const DEFAULT_CURRENCY: CurrencyCode = 'PLN'

const toMajor = (money: Money | null) => (money ? (money.amount / 100).toFixed(2) : '')

/** undefined: the text is not a number (yet), e.g. "-" or "1e". */
const parseMajor = (text: string): number | null | undefined => {
  if (text.trim() === '') return null
  const major = Number(text.replace(',', '.'))
  return Number.isFinite(major) ? Math.round(major * 100) : undefined
}

const isCurrency = (code: string): code is CurrencyCode => CURRENCIES.some((c) => c === code)

/** Major units in the input (12.50), minor units in the value (1250). The currency is always visible and changeable. */
export const MoneyInput = ({ id, field, value, onChange }: FieldEditProps<ExtractedValue<'money'>>) => {
  const [text, setText] = useState(toMajor(value.value))
  // The text is the user's own while it still means the value; a value set from outside (pointing) wins.
  const typed = parseMajor(text)
  const shown = typed === undefined || typed === (value.value?.amount ?? null) ? text : toMajor(value.value)
  const currency = value.value?.currency ?? DEFAULT_CURRENCY

  const commit = (next: string, nextCurrency: CurrencyCode) => {
    const major = Number(next.replace(',', '.'))
    if (next.trim() === '') onChange({ ...value, value: null })
    else if (Number.isFinite(major)) onChange({ ...value, value: { amount: Math.round(major * 100), currency: nextCurrency } })
  }

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        inputMode="decimal"
        className="min-h-touch flex-1 text-right tabular-nums"
        value={shown}
        onChange={(event) => {
          setText(event.target.value)
          commit(event.target.value, currency)
        }}
      />
      <Select
        value={currency}
        onValueChange={(code) => {
          if (isCurrency(code)) commit(shown, code)
        }}
      >
        <SelectTrigger className="min-h-touch w-24" aria-label={`${field.label} currency`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
