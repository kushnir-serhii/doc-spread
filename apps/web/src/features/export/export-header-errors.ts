import type { DocumentType, ExportColumnMapping, ExportFormat } from '@/lib/mock/types'
import { buildExportPlan } from './export-plan'

/**
 * Inline errors by column key (see `columnKey`): empty headers, and headers that collide in the main
 * file (money's `<header>_currency` and flattened table columns count) or between sheets/files.
 */
export const headerErrors = (
  type: DocumentType,
  mapping: ExportColumnMapping,
  format: ExportFormat,
): Map<string, string> => {
  const errors = new Map<string, string>()
  const plan = buildExportPlan(type, mapping, format)
  const check = (items: { columnKey: string; header: string }[], what: string) => {
    const counts = new Map<string, number>()
    for (const { header } of items) counts.set(header, (counts.get(header) ?? 0) + 1)
    for (const { columnKey, header } of items) {
      if (errors.has(columnKey)) continue
      if (header === '') errors.set(columnKey, 'Enter a name.')
      else if ((counts.get(header) ?? 0) > 1) errors.set(columnKey, `"${header}" is already used by another ${what}.`)
    }
  }
  check(plan.owners, 'column')
  check(
    plan.separate.map((table) => ({ columnKey: table.columnKey, header: table.name })),
    'sheet or file',
  )
  return errors
}
