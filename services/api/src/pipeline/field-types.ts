// The parts of FieldDef, ColumnDef and FieldValue (apps/web/src/lib/mock/types.ts) that the extraction reads and writes.
import type { BBox } from './page-types.js'

export const SCALAR_FIELD_TYPES = ['text', 'number', 'money', 'date', 'boolean', 'select', 'email', 'phone', 'tax_id'] as const
export type ScalarFieldType = (typeof SCALAR_FIELD_TYPES)[number]

export interface ColumnDef {
  id: string
  key: string
  label: string
  type: ScalarFieldType
  hint?: string
  options?: string[]
}

export type FieldDef =
  | { id: string; key: string; label: string; type: ScalarFieldType; hint?: string; options?: string[] }
  | { id: string; key: string; label: string; type: 'table'; hint?: string; columns: ColumnDef[] }

/** Amount in the currency's minor unit (always an integer) and an ISO 4217 code. */
export interface StoredMoney {
  amount: number
  currency: string
}

export interface ExtractedScalar {
  type: ScalarFieldType
  value: string | number | boolean | StoredMoney | null
  /** 0..1 */
  confidence: number
  source?: { page: number; bbox: BBox }
}

export interface ExtractedTable {
  type: 'table'
  rows: { id: string; cells: Record<string, ExtractedScalar> }[]
}

export type StoredValue = ExtractedScalar | ExtractedTable

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isScalarType = (value: unknown): value is ScalarFieldType => SCALAR_FIELD_TYPES.some((type) => type === value)
const optionsOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((option): option is string => typeof option === 'string') : undefined

const parseColumn = (raw: unknown): ColumnDef | undefined => {
  if (!isObject(raw)) return undefined
  const { id, key, label, type, hint } = raw
  if (typeof id !== 'string' || typeof key !== 'string' || typeof label !== 'string' || !isScalarType(type)) return undefined
  return { id, key, label, type, ...(typeof hint === 'string' && hint !== '' ? { hint } : {}), options: optionsOf(raw.options) }
}

/** Reads the `fields` jsonb of a type version; entries that don't have the expected shape are skipped. */
export const parseFieldDefs = (raw: unknown): FieldDef[] => {
  if (!Array.isArray(raw)) return []
  const fields: FieldDef[] = []
  for (const entry of raw) {
    if (!isObject(entry)) continue
    const { id, key, label, type, hint } = entry
    if (typeof id !== 'string' || typeof key !== 'string' || typeof label !== 'string') continue
    const hintPart = typeof hint === 'string' && hint !== '' ? { hint } : {}
    if (type === 'table') {
      const columns = (Array.isArray(entry.columns) ? entry.columns : []).flatMap((column) => parseColumn(column) ?? [])
      fields.push({ id, key, label, type, ...hintPart, columns })
    } else if (isScalarType(type)) {
      fields.push({ id, key, label, type, ...hintPart, options: optionsOf(entry.options) })
    }
  }
  return fields
}
