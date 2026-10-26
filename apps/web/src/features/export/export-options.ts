import type { ExportFormat, Recipient } from '@/lib/mock/types'

export type RecipientChoice = { kind: 'saved'; id: string } | { kind: 'other'; address: string }

export type DestinationOption = { kind: 'download' } | { kind: 'email'; recipient: RecipientChoice }

/** Options chosen on the Export page; later slices add the column mapping next to these. */
export interface ExportOptions {
  format: ExportFormat
  destination: DestinationOption
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = { format: 'csv', destination: { kind: 'download' } }

export const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Plain text, opens in any spreadsheet or accounting tool.' },
  { value: 'xlsx', label: 'XLSX', description: 'Excel workbook; tables can go to their own sheets.' },
  { value: 'pdf_bundle', label: 'PDF bundle', description: 'The original documents in one archive, no columns.' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** undefined when the address is fine */
export const addressError = (address: string): string | undefined => {
  const value = address.trim()
  if (value === '') return 'Enter an email address.'
  return EMAIL_PATTERN.test(value) ? undefined : 'Enter a valid email address, like name@example.com.'
}

/** The address an email export goes to, or undefined for a download or an unknown saved recipient. */
export const resolveRecipient = (destination: DestinationOption, recipients: Recipient[]): string | undefined => {
  if (destination.kind !== 'email') return undefined
  const { recipient } = destination
  return recipient.kind === 'other' ? recipient.address.trim() : recipients.find((r) => r.id === recipient.id)?.email
}
