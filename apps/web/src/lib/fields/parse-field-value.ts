import { CURRENCIES, type CurrencyCode, type FieldDef, type FieldValue, type FieldValueMap, type ScalarFieldType } from '@/lib/mock/types'
import { DEFAULT_CURRENCY } from './default-currency'

/** A parsed value without confidence or source: the caller adds those. */
export type ParsedValue = {
  [K in ScalarFieldType]: { type: K; value: FieldValueMap[K] }
}[ScalarFieldType]

/** `warning`: parsed, but part of the value was assumed (e.g. a currency); the user must check it. */
export type ParseResult = { ok: true; value: ParsedValue; warning?: string } | { ok: false; reason: string }

type ParseTarget = Pick<FieldDef, 'options'> & { type: ScalarFieldType }

const fail = (reason: string): ParseResult => ({ ok: false, reason })

const quote = (text: string) => `"${text.length > 40 ? `${text.slice(0, 40)}…` : text}"`

/** Text from the OCR may use NBSP and other odd spaces; collapse them all to plain single spaces. */
const clean = (text: string) => text.replace(/\s+/g, ' ').trim()

const parseNumber = (raw: string): number | null => {
  const text = raw.replace(/\s/g, '')
  if (!/^[+-]?[\d.,]*\d[\d.,]*$/.test(text)) return null
  const lastDot = text.lastIndexOf('.')
  const lastComma = text.lastIndexOf(',')
  let normalized: string
  if (lastDot >= 0 && lastComma >= 0) {
    // both present: the one that comes last is the decimal mark
    const decimal = lastDot > lastComma ? '.' : ','
    const thousands = decimal === '.' ? /,/g : /\./g
    normalized = text.replace(thousands, '').replace(decimal, '.')
  } else if (lastComma >= 0) {
    const parts = text.split(',')
    // "1,234" and "1,234,567" are thousands groups; "12,5" and "1234,56" are decimals
    const grouped = parts.length > 2 || (parts[1]?.length === 3 && (parts[0]?.replace(/^[+-]/, '').length ?? 0) <= 3)
    normalized = grouped ? parts.join('') : text.replace(',', '.')
  } else {
    // dots: several mean thousands groups, a single one is a decimal point ("1234.5")
    normalized = text.split('.').length > 2 ? text.replace(/\./g, '') : text
  }
  const result = Number(normalized)
  return Number.isFinite(result) ? result : null
}

const CURRENCY_SYMBOLS: Record<string, CurrencyCode> = { zł: 'PLN', zl: 'PLN', '€': 'EUR', $: 'USD', '£': 'GBP' }
const CURRENCY_PATTERN = /zł|zl|pln|eur|usd|gbp|[€$£]/gi

const currencyOf = (code: string): CurrencyCode | null => {
  const lower = code.toLowerCase()
  return CURRENCY_SYMBOLS[lower] ?? CURRENCIES.find((c) => c.toLowerCase() === lower) ?? null
}

const parseDate = (text: string): string | null => {
  const dayFirst = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text)
  const yearFirst = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  const [year, month, day] = yearFirst
    ? [yearFirst[1], yearFirst[2], yearFirst[3]].map(Number)
    : dayFirst
      ? [dayFirst[3], dayFirst[2], dayFirst[1]].map(Number)
      : []
  if (year === undefined || month === undefined || day === undefined) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  // Date rolls 31.02 over to March: a changed month or day means the date does not exist
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const YES = ['yes', 'tak', 'true', '✓', '✔', 'x']
const NO = ['no', 'nie', 'false', '✗', '✘']

/**
 * Turns text pointed at in a document into a value of the field's type.
 * `current` only supplies a fallback currency for money.
 */
export const parseFieldValue = (field: ParseTarget, rawText: string, current?: FieldValue): ParseResult => {
  const text = clean(rawText)
  if (text === '') return fail('Nothing was selected. Point at the words that hold the value.')
  switch (field.type) {
    case 'text':
      return { ok: true, value: { type: 'text', value: text } }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)
        ? { ok: true, value: { type: 'email', value: text } }
        : fail(`${quote(text)} doesn't look like an email address.`)
    case 'phone': {
      const digits = text.replace(/\D/g, '')
      return /^[\d\s+\-()]+$/.test(text) && digits.length >= 6
        ? { ok: true, value: { type: 'phone', value: text } }
        : fail(`${quote(text)} doesn't look like a phone number.`)
    }
    case 'tax_id': {
      const id = text.replace(/[\s-]/g, '')
      return /^[A-Za-z0-9]{8,}$/.test(id)
        ? { ok: true, value: { type: 'tax_id', value: id } }
        : fail(`${quote(text)} isn't a tax ID (at least 8 letters or digits).`)
    }
    case 'number': {
      const value = parseNumber(text)
      return value === null ? fail(`${quote(text)} isn't a number.`) : { ok: true, value: { type: 'number', value } }
    }
    case 'money': {
      const found = text.match(CURRENCY_PATTERN)
      const amount = parseNumber(text.replace(CURRENCY_PATTERN, ''))
      if (amount === null || (found?.length ?? 0) > 1) return fail(`${quote(text)} isn't an amount (try 1 234,56 zł).`)
      const fromText = found ? currencyOf(found[0]) : null
      // no currency in the text: keep the current one, else the default, and never silently
      const kept = current?.type === 'money' ? current.value?.currency : undefined
      const currency = fromText ?? kept ?? DEFAULT_CURRENCY
      const value: ParsedValue = { type: 'money', value: { amount: Math.round(amount * 100), currency } }
      if (fromText) return { ok: true, value }
      return { ok: true, value, warning: `There is no currency in ${quote(text)}, so ${currency} was assumed. Check that it is right.` }
    }
    case 'date': {
      const value = parseDate(text)
      return value === null
        ? fail(`${quote(text)} isn't a date this form understands (use 12.03.2026).`)
        : { ok: true, value: { type: 'date', value } }
    }
    case 'boolean': {
      const key = text.toLowerCase()
      if (YES.includes(key)) return { ok: true, value: { type: 'boolean', value: true } }
      if (NO.includes(key)) return { ok: true, value: { type: 'boolean', value: false } }
      return fail(`${quote(text)} isn't yes or no.`)
    }
    case 'select': {
      const options = field.options ?? []
      const match = options.find((option) => option.trim().toLowerCase() === text.toLowerCase())
      return match !== undefined
        ? { ok: true, value: { type: 'select', value: match } }
        : fail(`${quote(text)} is not one of the options: ${options.join(', ') || 'none defined'}.`)
    }
    default: {
      const unreachable: never = field.type
      return unreachable
    }
  }
}
