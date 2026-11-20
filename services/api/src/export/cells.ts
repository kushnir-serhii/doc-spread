import type { Cell, FieldValue, ScalarFieldType, ScalarValue } from './types.js'

const digitsCache = new Map<string, number>()

/** Decimal places of the currency's minor unit (USD 2, JPY 0), from Intl; 2 if the code is unknown. */
export const minorDigits = (currency: string): number => {
  const cached = digitsCache.get(currency)
  if (cached !== undefined) return cached
  let digits: number
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    digits = 2
  }
  digitsCache.set(currency, digits)
  return digits
}

/** Major units as text with the currency's decimals, dot separator, no float math: 123000 USD -> "1230.00". */
export const majorText = (amount: number, currency: string): string => {
  const digits = minorDigits(currency)
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (digits === 0) return `${sign}${abs}`
  const base = 10 ** digits
  return `${sign}${Math.trunc(abs / base)}.${String(abs % base).padStart(digits, '0')}`
}

const isMoney = (value: unknown): value is { amount: number; currency: string } =>
  typeof value === 'object' &&
  value !== null &&
  'amount' in value &&
  'currency' in value &&
  typeof value.amount === 'number' &&
  Number.isFinite(value.amount) &&
  typeof value.currency === 'string'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const EMPTY: Cell = { text: '', value: null }
const text = (value: string): Cell => ({ text: value, value })

const dateCell = (value: string): Cell => {
  const match = ISO_DATE.exec(value)
  if (!match) return text(value)
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  // reject 2026-02-31 style dates: keep them as text rather than shifting them
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return text(value)
  return { text: value, value: date, format: 'yyyy-mm-dd' }
}

const moneyCells = (value: { amount: number; currency: string }): Cell[] => {
  const digits = minorDigits(value.currency)
  const major = Number((value.amount / 10 ** digits).toFixed(digits))
  return [
    { text: majorText(value.amount, value.currency), value: major, format: digits === 0 ? '#,##0' : `#,##0.${'0'.repeat(digits)}` },
    text(value.currency),
  ]
}

/**
 * Cells for one value: money is two cells (amount in major units as a number, currency), everything else one;
 * dates are real dates, numbers numbers, booleans booleans, empty is empty. Never throws on a malformed value.
 */
export const scalarCells = (stored: FieldValue | ScalarValue | undefined, type: ScalarFieldType): Cell[] => {
  if (type === 'money') {
    return stored?.type === 'money' && isMoney(stored.value) ? moneyCells(stored.value) : [EMPTY, EMPTY]
  }
  if (!stored || stored.type === 'table' || stored.value === null || stored.value === undefined) return [EMPTY]
  const { value } = stored
  switch (stored.type) {
    case 'number':
      return [typeof value === 'number' && Number.isFinite(value) ? { text: String(value), value } : EMPTY]
    case 'boolean':
      return [typeof value === 'boolean' ? { text: value ? 'true' : 'false', value } : EMPTY]
    case 'money':
      return isMoney(value) ? moneyCells(value) : [EMPTY]
    case 'date':
      return [typeof value === 'string' ? dateCell(value) : EMPTY]
    default:
      return [typeof value === 'string' ? text(value) : EMPTY]
  }
}

/** Header cells matching `scalarCells`: money gets a second `<header>_currency` header. */
export const scalarHeaders = (header: string, type: ScalarFieldType): string[] =>
  type === 'money' ? [header, `${header}_currency`] : [header]
