import { EXPORT_BUILTIN_COLUMNS } from '@/lib/mock/types'
import type {
  ColumnDef,
  DocumentType,
  ExportTableColumn,
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

const tableColumn = (column: ColumnDef): ExportTableColumn => ({
  columnId: column.id,
  include: true,
  header: column.key,
})

const tableFields = (type: DocumentType): FieldDef[] => type.fields.filter((f) => f.type === 'table')

/** Saved order, headers and include kept; new columns last (included); deleted ones drop out. */
const restoreTableColumns = (field: FieldDef, saved: ExportTableColumn[] | undefined): ExportTableColumn[] => {
  const defs = field.columns ?? []
  if (!saved) return defs.map(tableColumn)
  const ids = new Set(defs.map((c) => c.id))
  const kept = saved.filter((c) => ids.has(c.columnId))
  const present = new Set(kept.map((c) => c.columnId))
  return [...kept, ...defs.filter((c) => !present.has(c.id)).map(tableColumn)]
}

const tableColumnLists = (type: DocumentType, saved?: ExportColumnMapping): Record<string, ExportTableColumn[]> =>
  Object.fromEntries(tableFields(type).map((f) => [f.id, restoreTableColumns(f, saved?.tableColumns?.[f.id])]))

/** The columns of a table field in output order; defaults when the mapping has no list for it. */
export const resolveTableColumns = (mapping: ExportColumnMapping, field: FieldDef): ExportTableColumn[] =>
  mapping.tableColumns?.[field.id] ?? restoreTableColumns(field, undefined)

/** Built-in columns off at the top, then every field in type order. */
export const defaultExportMapping = (type: DocumentType): ExportColumnMapping => ({
  columns: [...EXPORT_BUILTIN_COLUMNS.map(builtinColumn), ...type.fields.map(fieldColumn)],
  tables: tableModes(type),
  tableColumns: tableColumnLists(type),
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
  return {
    columns: [...missingBuiltins, ...kept, ...added],
    tables: tableModes(type, saved),
    tableColumns: tableColumnLists(type, saved),
  }
}

export const columnKey = (column: ExportColumn): string =>
  column.source.kind === 'field' ? `field:${column.source.fieldId}` : `builtin:${column.source.id}`

/** Key of one column of a table field (inline errors). */
export const tableColumnKey = (tableFieldId: string, columnId: string): string => `table:${tableFieldId}:${columnId}`
