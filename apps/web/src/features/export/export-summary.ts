import { getComputedFieldIds } from '@/lib/fields/computed-fields'
import { computeValues } from '@/lib/fields/run-checks'
import { formatMoney } from '@/lib/mock/format'
import type { Document, DocumentType, ExportColumnMapping, ExportFormat, Recipient } from '@/lib/mock/types'
import { FORMAT_OPTIONS } from './export-options'
import type { DestinationOption } from './export-options'

export interface MoneyTotal {
  columnKey: string
  label: string
  /** formatted totals, one per currency */
  amounts: string[]
}

/** Per included top-level money column: the sum per currency. Computed fields are computed when not stored. */
export const moneyTotals = (
  type: DocumentType,
  mapping: ExportColumnMapping,
  format: ExportFormat,
  documents: Document[],
  locale?: string,
): MoneyTotal[] => {
  if (format === 'pdf_bundle') return []
  const computedIds = getComputedFieldIds(type)
  const totals: MoneyTotal[] = []
  for (const column of mapping.columns) {
    const { source } = column
    if (!column.include || source.kind !== 'field') continue
    const { fieldId } = source
    const field = type.fields.find((f) => f.id === fieldId)
    if (!field || field.type !== 'money') continue
    const sums = new Map<string, number>()
    for (const doc of documents) {
      const outcome = computedIds.has(fieldId) ? computeValues(type, doc.values)[fieldId] : undefined
      const value = outcome ? (outcome.ok ? outcome.value : undefined) : doc.values[fieldId]
      if (value?.type !== 'money' || !value.value) continue
      sums.set(value.value.currency, (sums.get(value.value.currency) ?? 0) + value.value.amount)
    }
    totals.push({
      columnKey: fieldId,
      label: field.label,
      amounts: [...sums].map(([currency, minor]) => formatMoney(minor, currency, locale)),
    })
  }
  return totals
}

export const formatLabel = (format: ExportFormat): string =>
  FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? format

/** "Download" or "Email to Name <address>"; undefined when the saved recipient is unknown. */
export const destinationText = (destination: DestinationOption, recipients: Recipient[]): string | undefined => {
  if (destination.kind === 'download') return 'Download'
  const { recipient } = destination
  if (recipient.kind === 'other') return `Email to ${recipient.address.trim()}`
  const saved = recipients.find((r) => r.id === recipient.id)
  return saved ? `Email to ${saved.name} <${saved.email}>` : undefined
}
