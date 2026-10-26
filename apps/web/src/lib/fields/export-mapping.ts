import { EXPORT_BUILTIN_COLUMNS } from '@/lib/mock/types'
import type {
  DocumentType,
  ExportBuiltinColumn,
  ExportColumn,
  ExportColumnMapping,
  FieldDef,
} from '@/lib/mock/types'

export const BUILTIN_LABELS: Record<ExportBuiltinColumn, string> = {
  document_id: 'Document ID',
  file_name: 'File name',
}

const builtinColumn = (id: ExportBuiltinColumn): ExportColumn => ({
  source: { kind: 'builtin', id },
  include: false,
  header: id,
})

const fieldColumn = (field: FieldDef): ExportColumn => ({
  source: { kind: 'field', fieldId: field.id },
  include: true,
  header: field.key,
})

const tableModes = (type: DocumentType, saved?: ExportColumnMapping): ExportColumnMapping['tables'] =>
  Object.fromEntries(
    type.fields.filter((f) => f.type === 'table').map((f) => [f.id, saved?.tables[f.id] ?? 'separate']),
  )

/** Built-in columns off at the top, then every field in type order. */
export const defaultExportMapping = (type: DocumentType): ExportColumnMapping => ({
  columns: [...EXPORT_BUILTIN_COLUMNS.map(builtinColumn), ...type.fields.map(fieldColumn)],
  tables: tableModes(type),
})

/** Keeps the saved order, headers and include; new fields go last (included), removed fields drop out. */
export const restoreExportMapping = (type: DocumentType, saved: ExportColumnMapping | null): ExportColumnMapping => {
  if (!saved) return defaultExportMapping(type)
  const fieldIds = new Set(type.fields.map((f) => f.id))
  const kept = saved.columns.filter((c) => c.source.kind === 'builtin' || fieldIds.has(c.source.fieldId))
  const present = new Set(kept.flatMap((c) => (c.source.kind === 'field' ? [c.source.fieldId] : [])))
  const missingBuiltins = EXPORT_BUILTIN_COLUMNS.filter(
    (id) => !kept.some((c) => c.source.kind === 'builtin' && c.source.id === id),
  ).map(builtinColumn)
  const added = type.fields.filter((f) => !present.has(f.id)).map(fieldColumn)
  return { columns: [...missingBuiltins, ...kept, ...added], tables: tableModes(type, saved) }
}

export const columnKey = (column: ExportColumn): string =>
  column.source.kind === 'field' ? `field:${column.source.fieldId}` : `builtin:${column.source.id}`
