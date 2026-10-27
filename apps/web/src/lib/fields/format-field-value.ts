import { formatDate, formatMoney } from '@/lib/mock/format'
import type { FieldValue } from '@/lib/mock/types'

const EMPTY = '—'

const formatText = (value: string | null): string => value?.trim() || EMPTY

/** No `locale`: the browser's. Callers pass `useFormatLocale()` (the company's locale). */
export const formatFieldValue = (
  value: FieldValue | null | undefined,
  locale?: string,
): string => {
  if (!value) return EMPTY

  switch (value.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'tax_id':
    case 'select':
      return formatText(value.value)
    case 'number':
      return value.value === null ? EMPTY : new Intl.NumberFormat(locale).format(value.value)
    case 'money':
      return value.value === null
        ? EMPTY
        : formatMoney(value.value.amount, value.value.currency, locale)
    case 'date':
      return formatDate(value.value, locale)
    case 'boolean':
      return value.value === null ? EMPTY : value.value ? 'Yes' : 'No'
    case 'table':
      return value.rows.length === 0
        ? EMPTY
        : `${value.rows.length} ${value.rows.length === 1 ? 'row' : 'rows'}`
    default: {
      const unreachable: never = value
      return unreachable
    }
  }
}
