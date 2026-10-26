import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { majorText, minorDigits, toMinor } from '@/lib/fields/currency-digits'
import { DEFAULT_CURRENCY } from '@/lib/fields/default-currency'
import { CURRENCIES, type CurrencyCode, type ExtractedValue, type Money } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

const moneyText = (money: Money | null) => (money ? majorText(money.amount, money.currency) : '')

/** undefined: the text is not a number (yet), e.g. "-" or "1e". */
const parseMajor = (text: string, currency: string): number | null | undefined => {
  if (text.trim() === '') return null
  const major = Number(text.replace(',', '.'))
  return Number.isFinite(major) ? toMinor(major, currency) : undefined
}

const isCurrency = (code: string): code is CurrencyCode => CURRENCIES.some((c) => c === code)

/** Major units in the input (12.50), minor units in the value (1250; JPY 1500 and 1500). The currency is always visible and changeable. */
export const MoneyInput = ({ id, field, value, onChange }: FieldEditProps<ExtractedValue<'money'>>) => {
  const [text, setText] = useState(moneyText(value.value))
  // The text is the user's own while it still means the value; a value set from outside (pointing) wins.
  const currency = value.value?.currency ?? DEFAULT_CURRENCY
  const typed = parseMajor(text, currency)
  const shown = typed === undefined || typed === (value.value?.amount ?? null) ? text : moneyText(value.value)

  const commit = (next: string, nextCurrency: CurrencyCode) => {
    const amount = parseMajor(next, nextCurrency)
    if (amount === null) onChange({ ...value, value: null })
    else if (amount !== undefined) onChange({ ...value, value: { amount, currency: nextCurrency } })
  }

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        inputMode={minorDigits(currency) === 0 ? 'numeric' : 'decimal'}
        step={10 ** -minorDigits(currency)}
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
