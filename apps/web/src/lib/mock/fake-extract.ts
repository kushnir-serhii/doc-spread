// Fake AI extractor for the mock API: deterministic per document id + field id.
// Used by upload, reassign and testExtract. Not part of the public mock API.
import { CURRENCIES } from './types'
import type { AnyExtractedValue, CurrencyCode, FieldDef, FieldValue, ScalarFieldType } from './types'
import { BASE_NOW, DAY, isoDate, makeRng } from './seed-utils'
import {
  booleanValue,
  dateValue,
  emailValue,
  moneyValue,
  numberValue,
  phoneValue,
  selectValue,
  tableValue,
  taxIdValue,
  textValue,
} from './value-builders'

const WORDS = [
  'Alfa', 'Beta', 'Projekt', 'Usługa', 'Warszawa', 'Serwis', 'Dostawa', 'Umowa',
  'Zakup', 'Biuro', 'Rozliczenie', 'Licencja', 'Transport', 'Konsulting',
]
const MAX_TABLE_ROWS = 4
const NULL_CHANCE = 0.12

/** FNV-1a, to turn text into an rng seed. */
const hash = (text: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const round2 = (n: number) => Math.round(n * 100) / 100
const int = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const digits = (rng: () => number, count: number) =>
  Array.from({ length: count }, () => int(rng, 0, 9)).join('')

const fakeScalar = (
  type: ScalarFieldType,
  options: string[] | undefined,
  currency: CurrencyCode,
  rng: () => number,
): AnyExtractedValue => {
  const confidence = round2(0.4 + rng() * 0.59)
  // decided up front so the rng sequence doesn't depend on the type
  const isNull = rng() < NULL_CHANCE
  if (isNull) {
    const empty: Record<ScalarFieldType, AnyExtractedValue> = {
      text: textValue(null, 0),
      number: numberValue(null, 0),
      money: moneyValue(null, currency, 0),
      date: dateValue(null, 0),
      boolean: booleanValue(null, 0),
      select: selectValue(null, 0),
      email: emailValue(null, 0),
      phone: phoneValue(null, 0),
      tax_id: taxIdValue(null, 0),
    }
    return empty[type]
  }
  switch (type) {
    case 'text': {
      const count = int(rng, 2, 3)
      return textValue(Array.from({ length: count }, () => WORDS[int(rng, 0, WORDS.length - 1)]).join(' '), confidence)
    }
    case 'number':
      return numberValue(int(rng, 1, 500), confidence)
    case 'money':
      return moneyValue(int(rng, 1_000, 500_000), currency, confidence)
    case 'date':
      return dateValue(isoDate(BASE_NOW - int(rng, 0, 60) * DAY), confidence)
    case 'boolean':
      return booleanValue(rng() > 0.5, confidence)
    case 'select':
      return selectValue(options && options.length > 0 ? options[int(rng, 0, options.length - 1)] : null, confidence)
    case 'email':
      return emailValue(`kontakt@firma-${int(rng, 1, 99)}.pl`, confidence)
    case 'phone':
      return phoneValue(`+48 22 ${digits(rng, 3)} ${digits(rng, 2)} ${digits(rng, 2)}`, confidence)
    case 'tax_id':
      return taxIdValue(digits(rng, 10), confidence)
    default: {
      const unreachable: never = type
      throw new Error(`Unknown field type: ${String(unreachable)}`)
    }
  }
}

/** A plausible value for every field. Money in one currency per document; same input, same output. */
export const fakeExtractFields = (docId: string, fields: readonly FieldDef[]): Record<string, FieldValue> => {
  const currency = CURRENCIES[hash(docId) % CURRENCIES.length]
  const values: Record<string, FieldValue> = {}
  for (const field of fields) {
    const type = field.type
    if (type !== 'table') {
      values[field.id] = fakeScalar(type, field.options, currency, makeRng(hash(`${docId}:${field.id}`)))
      continue
    }
    const rowCount = int(makeRng(hash(`${docId}:${field.id}:rows`)), 1, MAX_TABLE_ROWS)
    values[field.id] = tableValue(
      Array.from({ length: rowCount }, (_, i) => ({
        id: `${docId}-${field.id}-r${i + 1}`,
        cells: Object.fromEntries(
          (field.columns ?? []).map((column) => [
            column.id,
            fakeScalar(column.type, column.options, currency, makeRng(hash(`${docId}:${field.id}:${i}:${column.id}`))),
          ]),
        ),
      })),
    )
  }
  return values
}
