import { EXPORT_BUILTIN_COLUMNS } from './types.js'
import type {
  ColumnDef,
  ExportBuiltinColumn,
  ExportColumn,
  ExportColumnMapping,
  ExportFormat,
  ExportTableColumn,
  FieldDef,
  TableExportMode,
} from './types.js'

// Ported from apps/web/src/lib/fields/export-mapping.ts (defaults and restore) and
// apps/web/src/features/export/export-plan.ts (table modes). Keep in step with them.

const builtinColumn = (id: ExportBuiltinColumn): ExportColumn => ({ source: { kind: 'builtin', id }, include: false, header: id })
const fieldColumn = (field: FieldDef): ExportColumn => ({ source: { kind: 'field', fieldId: field.id }, include: true, header: field.key })
const tableColumn = (column: ColumnDef): ExportTableColumn => ({ columnId: column.id, include: true, header: column.key })
const tableFields = (fields: FieldDef[]): FieldDef[] => fields.filter((f) => f.type === 'table')

/** Saved order, headers and include kept; new columns last (included); deleted ones drop out. */
const restoreTableColumns = (field: FieldDef, saved: ExportTableColumn[] | undefined): ExportTableColumn[] => {
  const defs = field.columns ?? []
  if (!saved) return defs.map(tableColumn)
  const ids = new Set(defs.map((c) => c.id))
  const kept = saved.filter((c) => ids.has(c.columnId))
  const present = new Set(kept.map((c) => c.columnId))
  return [...kept, ...defs.filter((c) => !present.has(c.id)).map(tableColumn)]
}

/** The columns of a table field in output order; defaults when the mapping has no list for it. */
export const resolveTableColumns = (mapping: ExportColumnMapping, field: FieldDef): ExportTableColumn[] =>
  mapping.tableColumns?.[field.id] ?? restoreTableColumns(field, undefined)

/**
 * Keeps the saved order, headers and include; new fields go last (included), removed fields drop out.
 * Without a saved mapping: built-in columns off at the top, then every field in type order.
 */
export const restoreMapping = (fields: FieldDef[], saved: ExportColumnMapping | null): ExportColumnMapping => {
  const tables = tableFields(fields)
  if (!saved) {
    return {
      columns: [...EXPORT_BUILTIN_COLUMNS.map(builtinColumn), ...fields.map(fieldColumn)],
      tables: Object.fromEntries(tables.map((f) => [f.id, 'separate' as TableExportMode])),
      tableColumns: Object.fromEntries(tables.map((f) => [f.id, restoreTableColumns(f, undefined)])),
    }
  }
  const fieldIds = new Set(fields.map((f) => f.id))
  const kept = saved.columns.filter((c) => c.source.kind === 'builtin' || fieldIds.has(c.source.fieldId))
  const present = new Set(kept.flatMap((c) => (c.source.kind === 'field' ? [c.source.fieldId] : [])))
  const missingBuiltins = EXPORT_BUILTIN_COLUMNS.filter(
    (id) => !kept.some((c) => c.source.kind === 'builtin' && c.source.id === id),
  ).map(builtinColumn)
  const added = fields.filter((f) => !present.has(f.id)).map(fieldColumn)
  return {
    columns: [...missingBuiltins, ...kept, ...added],
    tables: Object.fromEntries(tables.map((f) => [f.id, saved.tables[f.id] ?? ('separate' as TableExportMode)])),
    tableColumns: Object.fromEntries(tables.map((f) => [f.id, restoreTableColumns(f, saved.tableColumns?.[f.id])])),
  }
}

/** XLSX always uses separate sheets; in CSV only one table may be flattened (the first one wins). */
export const resolveTableModes = (
  fields: FieldDef[],
  mapping: ExportColumnMapping,
  format: ExportFormat,
): Map<string, TableExportMode> => {
  const modes = new Map<string, TableExportMode>()
  let flattened = false
  for (const column of mapping.columns) {
    if (column.source.kind !== 'field' || !column.include) continue
    const { fieldId } = column.source
    const field = fields.find((f) => f.id === fieldId)
    if (field?.type !== 'table') continue
    const wanted = format === 'csv' ? (mapping.tables[field.id] ?? 'separate') : 'separate'
    const mode = wanted === 'flatten' && !flattened ? 'flatten' : 'separate'
    modes.set(field.id, mode)
    if (mode === 'flatten') flattened = true
  }
  return modes
}

// ---------- validation of a mapping sent by the browser ----------

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const MAX_COLUMNS = 500
const MAX_HEADER = 200

const parseHeader = (value: unknown): string | undefined => (typeof value === 'string' && value.length <= MAX_HEADER ? value : undefined)

/** Checks the shape of a mapping from the request body (or the jsonb saved on the type); undefined when it is not one. */
export const parseMapping = (input: unknown): ExportColumnMapping | undefined => {
  if (!isObject(input) || !Array.isArray(input.columns) || input.columns.length > MAX_COLUMNS || !isObject(input.tables)) return undefined
  const columns: ExportColumn[] = []
  for (const raw of input.columns as unknown[]) {
    if (!isObject(raw) || !isObject(raw.source) || typeof raw.include !== 'boolean') return undefined
    const header = parseHeader(raw.header)
    if (header === undefined) return undefined
    const { source } = raw
    if (source.kind === 'field' && typeof source.fieldId === 'string') {
      columns.push({ source: { kind: 'field', fieldId: source.fieldId }, include: raw.include, header })
    } else if (source.kind === 'builtin' && (source.id === 'document_id' || source.id === 'file_name')) {
      columns.push({ source: { kind: 'builtin', id: source.id }, include: raw.include, header })
    } else return undefined
  }
  const tables: Record<string, TableExportMode> = {}
  for (const [id, mode] of Object.entries(input.tables)) {
    if (mode !== 'separate' && mode !== 'flatten') return undefined
    tables[id] = mode
  }
  const mapping: ExportColumnMapping = { columns, tables }
  if (input.tableColumns !== undefined) {
    if (!isObject(input.tableColumns)) return undefined
    const tableColumns: Record<string, ExportTableColumn[]> = {}
    for (const [id, list] of Object.entries(input.tableColumns)) {
      if (!Array.isArray(list) || list.length > MAX_COLUMNS) return undefined
      const parsed: ExportTableColumn[] = []
      for (const raw of list as unknown[]) {
        if (!isObject(raw) || typeof raw.columnId !== 'string' || typeof raw.include !== 'boolean') return undefined
        const header = parseHeader(raw.header)
        if (header === undefined) return undefined
        parsed.push({ columnId: raw.columnId, include: raw.include, header })
      }
      tableColumns[id] = parsed
    }
    mapping.tableColumns = tableColumns
  }
  return mapping
}
