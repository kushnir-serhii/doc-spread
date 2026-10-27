import type { DocumentType, ExportColumnMapping, ExportFormat } from '@/lib/mock/types'
import { columnKey } from '@/lib/fields/export-mapping'
import { buildExportPlan, includedTableColumns, resolveTableModes } from './export-plan'

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
  // an included table needs a column; its separate columns still need a name (flattened ones go through the plan)
  const modes = resolveTableModes(type, mapping, format)
  for (const [fieldId, mode] of modes) {
    const field = type.fields.find((f) => f.id === fieldId)
    if (!field) continue
    const columns = includedTableColumns(field, mapping)
    if (columns.length === 0) {
      const tableRow = mapping.columns.find((c) => c.source.kind === 'field' && c.source.fieldId === fieldId)
      if (tableRow) errors.set(columnKey(tableRow), 'Pick at least one column, or untick the table.')
    } else if (mode === 'separate') {
      for (const { key, header } of columns) if (header === '') errors.set(key, 'Enter a name.')
    }
  }
  check(plan.owners, 'column')
  check(
    plan.separate.map((table) => ({ columnKey: table.columnKey, header: table.name })),
    'sheet or file',
  )
  // within a separate sheet/file: a column header may not repeat Document ID's or another column's
  for (const table of plan.separate) {
    const counts = new Map<string, number>()
    for (const { header } of table.owners) counts.set(header, (counts.get(header) ?? 0) + 1)
    for (const { columnKey: key, header } of table.owners) {
      if (key === table.documentIdKey || header === '' || errors.has(key)) continue
      if ((counts.get(header) ?? 0) > 1) errors.set(key, `"${header}" is already used in this ${format === 'xlsx' ? 'sheet' : 'file'}.`)
    }
  }
  return errors
}
