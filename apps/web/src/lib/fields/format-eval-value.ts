import { formatDate, formatMoney } from '@/lib/mock/format'
import type { EvalValue } from './evaluate'

/** A computed value for display; money always shows its currency. No `locale`: the browser's. Callers pass `useFormatLocale()`. */
export const formatEvalValue = (value: EvalValue, locale?: string): string => {
  switch (value.type) {
    case 'text':
      return value.value === '' ? '—' : value.value
    case 'number':
      return new Intl.NumberFormat(locale).format(value.value)
    case 'money':
      return formatMoney(value.value.amount, value.value.currency, locale)
    case 'date':
      return formatDate(value.value, locale)
    case 'boolean':
      return value.value ? 'Yes' : 'No'
    default: {
      const unreachable: never = value
      throw new Error(`Unknown value: ${String(unreachable)}`)
    }
  }
}
