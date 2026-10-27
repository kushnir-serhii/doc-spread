import { getComputedFieldIds } from '@/lib/fields/computed-fields'
import { computeValues } from '@/lib/fields/run-checks'
import { applyComputedCells } from '@/lib/fields/evaluate-rows'
import { columnKey, resolveTableColumns, tableColumnKey } from '@/lib/fields/export-mapping'
import type {
  ColumnDef,
  Document,
  DocumentType,
  ExportColumn,
  ExportColumnMapping,
  ExportFormat,
  FieldDef,
  TableExportMode,
} from '@/lib/mock/types'
import { scalarCells, scalarHeaders, scalarNumeric } from './export-cells'

/** An output header and the mapping row it belongs to (for error messages). */
export interface PlanHeader {
  columnKey: string
  header: string
}

export interface SeparateTable {
  columnKey: string
  field: FieldDef
  /** sheet or file name */
  name: string
  /** the sheet's/file's header row: Document ID first */
  headers: string[]
  numeric: boolean[]
  /** every header with its owner; the Document ID owner has `columnKey` = `documentIdKey` */
  owners: PlanHeader[]
  /** the Document ID header's mapping row */
  documentIdKey: string
  /** one row per table row (none for a document without rows) */
  rowsFor: (doc: Document) => string[][]
}

export interface ExportPlan {
  /** the main file's header row */
  headers: string[]
  /** per header: the cells are numbers */
  numeric: boolean[]
  /** one output row per document, or per table row for a flattened table */
  rowsFor: (doc: Document) => string[][]
  /** every header of the main file with its owner, for collision checks */
  owners: PlanHeader[]
  /** tables that go to their own sheet or file */
  separate: SeparateTable[]
}

const fieldOf = (type: DocumentType, column: ExportColumn): FieldDef | undefined => {
  const { source } = column
  return source.kind === 'field' ? type.fields.find((f) => f.id === source.fieldId) : undefined
}

/** XLSX always uses separate sheets; only one table may be flattened (the first one wins). */
export const resolveTableModes = (
  type: DocumentType,
  mapping: ExportColumnMapping,
  format: ExportFormat,
): Map<string, TableExportMode> => {
  const modes = new Map<string, TableExportMode>()
  let flattened = false
  for (const column of mapping.columns) {
    const field = fieldOf(type, column)
    if (!field || field.type !== 'table' || !column.include) continue
    const wanted = format === 'csv' ? (mapping.tables[field.id] ?? 'separate') : 'separate'
    const mode = wanted === 'flatten' && !flattened ? 'flatten' : 'separate'
    modes.set(field.id, mode)
    if (mode === 'flatten') flattened = true
  }
  return modes
}

/** Document ID is the link whenever a table goes to its own sheet or file. */
export const isDocumentIdForced = (type: DocumentType, mapping: ExportColumnMapping, format: ExportFormat): boolean =>
  [...resolveTableModes(type, mapping, format).values()].includes('separate')

/** A table's included columns in the mapped order, with their error key and trimmed header. */
export const includedTableColumns = (
  field: FieldDef,
  mapping: ExportColumnMapping,
): { key: string; header: string; def: ColumnDef }[] =>
  resolveTableColumns(mapping, field).flatMap((col) => {
    const def = field.columns?.find((c) => c.id === col.columnId)
    return def && col.include ? [{ key: tableColumnKey(field.id, col.columnId), header: col.header.trim(), def }] : []
  })

const separateTable = (
  type: DocumentType,
  mapping: ExportColumnMapping,
  key: string,
  field: FieldDef,
  name: string,
): SeparateTable => {
  const idColumn = mapping.columns.find((c) => c.source.kind === 'builtin' && c.source.id === 'document_id')
  const documentIdKey = idColumn ? columnKey(idColumn) : 'document_id'
  const headers = [idColumn?.header.trim() ?? '']
  const numeric = [false]
  const owners: PlanHeader[] = [{ columnKey: documentIdKey, header: headers[0] }]
  const columns = includedTableColumns(field, mapping)
  for (const { key: colKey, header: colName, def } of columns) {
    const flags = scalarNumeric(def.type)
    scalarHeaders(colName, def.type).forEach((header, i) => {
      headers.push(header)
      numeric.push(flags[i] ?? false)
      owners.push({ columnKey: colKey, header })
    })
  }
  const rowsFor = (doc: Document): string[][] => {
    // computed cells are not stored for documents approved earlier: compute them now
    const table = applyComputedCells(type, doc.values)[field.id]
    const rows = table?.type === 'table' ? table.rows : []
    return rows.map((row) => [doc.id, ...columns.flatMap(({ def }) => scalarCells(row.cells[def.id], def.type))])
  }
  return { columnKey: key, field, name, headers, numeric, owners, documentIdKey, rowsFor }
}

export const buildExportPlan = (type: DocumentType, mapping: ExportColumnMapping, format: ExportFormat): ExportPlan => {
  const modes = resolveTableModes(type, mapping, format)
  const forced = isDocumentIdForced(type, mapping, format)
  const headers: string[] = []
  const numeric: boolean[] = []
  const owners: PlanHeader[] = []
  const readers: ((doc: Document) => string[])[] = []
  const separate: SeparateTable[] = []
  let flat: { field: FieldDef } | undefined
  const computedIds = getComputedFieldIds(type)

  const push = (key: string, names: string[], flags: boolean[], read: (doc: Document) => string[]) => {
    names.forEach((header, i) => {
      headers.push(header)
      numeric.push(flags[i] ?? false)
      owners.push({ columnKey: key, header })
    })
    readers.push(read)
  }

  for (const column of mapping.columns) {
    const key = columnKey(column)
    const header = column.header.trim()
    const { source } = column
    if (source.kind === 'builtin') {
      const id = source.id
      if (!column.include && !(id === 'document_id' && forced)) continue
      push(key, [header], [false], (doc) => [id === 'document_id' ? doc.id : doc.file.name])
      continue
    }
    const field = fieldOf(type, column)
    if (!field || !column.include) continue
    if (field.type === 'table') {
      if (modes.get(field.id) === 'flatten') flat = { field }
      else separate.push(separateTable(type, mapping, key, field, header))
      continue
    }
    const fieldType = field.type
    // a computed field is computed from the document's values: documents approved earlier have none stored
    const read = computedIds.has(field.id)
      ? (doc: Document) => {
          const outcome = computeValues(type, doc.values)[field.id]
          return scalarCells(outcome?.ok ? outcome.value : undefined, fieldType)
        }
      : (doc: Document) => scalarCells(doc.values[field.id], fieldType)
    push(key, scalarHeaders(header, fieldType), scalarNumeric(fieldType), read)
  }

  const tableColumns = flat ? includedTableColumns(flat.field, mapping) : []
  for (const { key, header: name, def } of tableColumns) {
    const flags = scalarNumeric(def.type)
    scalarHeaders(name, def.type).forEach((header, i) => {
      headers.push(header)
      numeric.push(flags[i] ?? false)
      owners.push({ columnKey: key, header })
    })
  }

  const rowsFor = (doc: Document): string[][] => {
    const base = readers.flatMap((read) => read(doc))
    if (!flat) return [base]
    // computed cells are not stored for documents approved earlier: compute them now
    const table = applyComputedCells(type, doc.values)[flat.field.id]
    const rows = table?.type === 'table' ? table.rows : []
    if (rows.length === 0) return [[...base, ...tableColumns.flatMap(({ def }) => scalarCells(undefined, def.type))]]
    return rows.map((row) => [
      ...base,
      ...tableColumns.flatMap(({ def }) => scalarCells(row.cells[def.id], def.type)),
    ])
  }

  return { headers, numeric, rowsFor, owners, separate }
}
