import type { ColumnDef, FieldDef, ScalarFieldType } from './field-types.ts'

type Schema = Record<string, unknown>

// The API limits a schema to 16 union types (nullable values count), so no value is nullable: a field carries
// `found: false` when the document does not have it, and the value is then an empty placeholder.
const describe = (item: { label: string; hint?: string; type: string; options?: string[] }): string => {
  const parts = [item.label]
  if (item.hint) parts.push(item.hint)
  if (item.type === 'date') parts.push('ISO 8601 date, YYYY-MM-DD.')
  if (item.type === 'select' && item.options?.length) parts.push(`One of: ${item.options.join(' | ')}.`)
  return parts.join('. ')
}

const MONEY_SCHEMA: Schema = {
  type: 'object',
  properties: {
    amount: { type: 'string', description: 'Plain decimal number with a dot as the separator and no thousands separator, e.g. "1234.50".' },
    currency: { type: 'string', description: 'ISO 4217 code, only if the document states it (a code or an unambiguous symbol); otherwise an empty string.' },
    currencyFromDocument: { type: 'boolean', description: 'true only when the currency was read from the document. Never guess a currency.' },
  },
  required: ['amount', 'currency', 'currencyFromDocument'],
  additionalProperties: false,
}

const valueSchema = (type: ScalarFieldType, options?: string[]): Schema => {
  switch (type) {
    case 'number':
      return { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'money':
      return MONEY_SCHEMA
    case 'select':
      return options?.length ? { enum: [...options, ''] } : { type: 'string' }
    case 'text':
    case 'date':
    case 'email':
    case 'phone':
    case 'tax_id':
      return { type: 'string' }
    default: {
      const unreachable: never = type
      return unreachable
    }
  }
}

/** One answer: the value, how sure the model is, and the OCR tokens the value was read from. */
const cellSchema = (item: ColumnDef | Extract<FieldDef, { type: ScalarFieldType }>): Schema => ({
  type: 'object',
  description: describe(item),
  properties: {
    found: { type: 'boolean', description: 'false if the document does not contain this value; then value is a placeholder (empty string, 0, false).' },
    value: valueSchema(item.type, item.options),
    confidence: { type: 'number', description: 'From 0 to 1: how sure you are that the value is right.' },
    tokenIds: { type: 'string', description: 'Ids of the OCR tokens the value was read from, separated by commas; empty if none.' },
  },
  required: ['found', 'value', 'confidence', 'tokenIds'],
  additionalProperties: false,
})

const objectOf = (properties: Record<string, Schema>): Schema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
})

/**
 * The API refuses a schema whose compiled grammar is too large (measured: about 13 answers with `found`, a money
 * object and token ids fit, a table of 8 columns fits alone, and the two together do not). So a type is extracted in
 * several calls: scalar fields in groups of this size, and every table field on its own.
 */
const MAX_SCALARS_PER_CALL = 10

export const planExtractionCalls = (fields: FieldDef[]): FieldDef[][] => {
  const scalars = fields.filter((field) => field.type !== 'table')
  const chunks: FieldDef[][] = []
  for (let i = 0; i < scalars.length; i += MAX_SCALARS_PER_CALL) chunks.push(scalars.slice(i, i + MAX_SCALARS_PER_CALL))
  for (const field of fields) if (field.type === 'table') chunks.push([field])
  return chunks
}

/** The structured-output schema for a type version: one property per field key. */
export const buildExtractionSchema = (fields: FieldDef[]): Schema =>
  objectOf(
    Object.fromEntries(
      fields.map((field): [string, Schema] => {
        if (field.type !== 'table') return [field.key, cellSchema(field)]
        const row = objectOf({ cells: objectOf(Object.fromEntries(field.columns.map((column): [string, Schema] => [column.key, cellSchema(column)]))) })
        return [
          field.key,
          { type: 'object', description: describe(field), properties: { rows: { type: 'array', items: row } }, required: ['rows'], additionalProperties: false },
        ]
      }),
    ),
  )

export const CLASSIFY_SCHEMA: Schema = objectOf({
  typeId: { type: 'string', description: 'The id of the matching document type, or an empty string if none fits.' },
  confidence: { type: 'number', description: 'From 0 to 1: how sure you are about the choice.' },
})

export const CLASSIFY_SYSTEM =
  'You classify business documents. Choose the document type that best matches the text of the first page, ' +
  'using each type\'s name and description. If none fits, answer an empty typeId. Answer only with the requested JSON.'

export const EXTRACT_SYSTEM =
  'You extract fields from a business document. You get the original file and a list of OCR tokens, one per line as id|page|text ' +
  '(page numbers start at 0). For every field return the value, a confidence from 0 to 1, and the ids of the tokens the value was read from. ' +
  'When a value is not in the document set found to false; never invent values. For money, never guess the currency: set currencyFromDocument to true ' +
  'only when the document states it. Answer only with the requested JSON.'
