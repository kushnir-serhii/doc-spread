import type { FieldValue, Money, ScalarFieldType } from '@/lib/mock/types'

/** Major units with the currency's decimals (2 for every supported currency), dot separator: 123000 -> "1230.00". */
export const moneyAmount = (money: Money): string => {
  const abs = Math.abs(money.amount)
  const major = Math.trunc(abs / 100)
  const minor = String(abs % 100).padStart(2, '0')
  return `${money.amount < 0 ? '-' : ''}${major}.${minor}`
}

/**
 * Machine-readable cells for one value: ISO dates, dot decimals, booleans as true/false,
 * empty as "". Money is two cells (amount, currency); everything else is one.
 */
export const scalarCells = (value: FieldValue | undefined, type: ScalarFieldType): string[] => {
  if (type === 'money') {
    return value?.type === 'money' && value.value ? [moneyAmount(value.value), value.value.currency] : ['', '']
  }
  if (!value || value.type === 'table' || value.value === null) return ['']
  switch (value.type) {
    case 'number':
      return [String(value.value)]
    case 'boolean':
      return [value.value ? 'true' : 'false']
    case 'money':
      return [moneyAmount(value.value), value.value.currency]
    case 'text':
    case 'email':
    case 'phone':
    case 'tax_id':
    case 'select':
    case 'date':
      return [value.value]
    default: {
      const unreachable: never = value
      return unreachable
    }
  }
}

/** Header cells matching `scalarCells`: money gets a second `<header>_currency` header. */
export const scalarHeaders = (header: string, type: ScalarFieldType): string[] =>
  type === 'money' ? [header, `${header}_currency`] : [header]

/** Which of the cells from `scalarCells` are numbers (right-aligned in the preview). */
export const scalarNumeric = (type: ScalarFieldType): boolean[] =>
  type === 'money' ? [true, false] : [type === 'number']
