import { useTestExtractPreviews } from '@/lib/api'
import { getComputedFieldIds } from '@/lib/fields/computed-fields'
import type { FieldAction, FieldDef, FieldValue } from '@/lib/mock/types'

/** Nothing was read for the field: no value, or a table without rows. */
export const isFieldEmpty = (value: FieldValue | undefined): boolean => {
  if (!value) return true
  if (value.type === 'table') return value.rows.length === 0
  return value.value === null || value.value === ''
}

export interface MissingField {
  fieldId: string
  label: string
  /** 1-based positions of the samples where it wasn't found */
  samples: number[]
}

export type SampleSummary =
  | { status: 'loading' }
  | { status: 'failed'; retry: () => void }
  | { status: 'ready'; found: number; total: number; missing: MissingField[] }

/** How many fields were found on every sample; runs the same previews as the tabs, so the cache is shared. */
export const useSampleSummary = (
  sampleIds: string[],
  fields: FieldDef[],
  actions: FieldAction[] = [],
): SampleSummary => {
  const results = useTestExtractPreviews(sampleIds, fields, actions)
  // A computed field is calculated, never read from the sample, so it isn't counted.
  const computed = getComputedFieldIds({ actions })
  const read = fields.filter((field) => !computed.has(field.id))
  if (read.length === 0) return { status: 'ready', found: 0, total: 0, missing: [] }
  if (results.some((result) => result.isError)) {
    return { status: 'failed', retry: () => results.forEach((result) => void result.refetch()) }
  }
  if (results.some((result) => !result.data)) return { status: 'loading' }

  const missing = read.flatMap((field): MissingField[] => {
    const samples = results.flatMap((result, index) => (isFieldEmpty(result.data?.[field.id]) ? [index + 1] : []))
    return samples.length > 0 ? [{ fieldId: field.id, label: field.label.trim() || 'Untitled field', samples }] : []
  })
  return { status: 'ready', found: read.length - missing.length, total: read.length, missing }
}
