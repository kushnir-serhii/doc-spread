// Small constructors for extracted values, used by the mock document seeds. Not part of the public mock API.
import type {
  BBox,
  CurrencyCode,
  DocumentType,
  ExtractedValue,
  FieldValue,
  TableValue,
} from './types'

export interface ValueSource {
  page: number
  bbox: BBox
}

const withSource = (source: ValueSource | undefined) => (source ? { source } : {})

export const textValue = (value: string | null, confidence: number, source?: ValueSource): ExtractedValue<'text'> => ({
  type: 'text',
  value,
  confidence,
  ...withSource(source),
})

export const numberValue = (value: number | null, confidence: number, source?: ValueSource): ExtractedValue<'number'> => ({
  type: 'number',
  value,
  confidence,
  ...withSource(source),
})

export const moneyValue = (
  amount: number | null,
  currency: CurrencyCode,
  confidence: number,
  source?: ValueSource,
): ExtractedValue<'money'> => ({
  type: 'money',
  value: amount === null ? null : { amount, currency },
  confidence,
  ...withSource(source),
})

export const dateValue = (value: string | null, confidence: number, source?: ValueSource): ExtractedValue<'date'> => ({
  type: 'date',
  value,
  confidence,
  ...withSource(source),
})

export const booleanValue = (value: boolean | null, confidence: number, source?: ValueSource): ExtractedValue<'boolean'> => ({
  type: 'boolean',
  value,
  confidence,
  ...withSource(source),
})

export const selectValue = (value: string | null, confidence: number, source?: ValueSource): ExtractedValue<'select'> => ({
  type: 'select',
  value,
  confidence,
  ...withSource(source),
})

export const emailValue = (value: string | null, confidence: number, source?: ValueSource): ExtractedValue<'email'> => ({
  type: 'email',
  value,
  confidence,
  ...withSource(source),
})

export const phoneValue = (value: string | null, confidence: number, source?: ValueSource): ExtractedValue<'phone'> => ({
  type: 'phone',
  value,
  confidence,
  ...withSource(source),
})

export const taxIdValue = (value: string | null, confidence: number, source?: ValueSource): ExtractedValue<'tax_id'> => ({
  type: 'tax_id',
  value,
  confidence,
  ...withSource(source),
})

export const tableValue = (rows: TableValue['rows']): TableValue => ({ type: 'table', rows })

/**
 * Values are written by field/column key (readable); documents store them by id.
 * Keys the type doesn't know are kept as they are, so findValueMismatches reports them.
 */
export const keyedValues = (type: DocumentType, byKey: Record<string, FieldValue>): Record<string, FieldValue> => {
  const out: Record<string, FieldValue> = {}
  for (const [key, value] of Object.entries(byKey)) {
    const field = type.fields.find((f) => f.key === key)
    if (!field) {
      out[key] = value
    } else if (value.type === 'table') {
      out[field.id] = tableValue(
        value.rows.map((row) => ({
          id: row.id,
          cells: Object.fromEntries(
            Object.entries(row.cells).map(([cellKey, cell]) => [
              field.columns?.find((c) => c.key === cellKey)?.id ?? cellKey,
              cell,
            ]),
          ),
        })),
      )
    } else {
      out[field.id] = value
    }
  }
  return out
}
