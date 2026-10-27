import { getComputedFieldIds } from '@/lib/fields/computed-fields'
import { computeValues } from '@/lib/fields/run-checks'
import { columnKey } from '@/lib/fields/export-mapping'
import type {
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

export const buildExportPlan = (type: DocumentType, mapping: ExportColumnMapping, format: ExportFormat): ExportPlan => {
  const modes = resolveTableModes(type, mapping, format)
  const forced = isDocumentIdForced(type, mapping, format)
  const headers: string[] = []
  const numeric: boolean[] = []
  const owners: PlanHeader[] = []
  const readers: ((doc: Document) => string[])[] = []
  const separate: SeparateTable[] = []
  let flat: { field: FieldDef; prefix: string } | undefined
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
      if (modes.get(field.id) === 'flatten') flat = { field, prefix: header }
      else separate.push({ columnKey: key, field, name: header })
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

  const tableColumns = flat?.field.columns ?? []
  if (flat) {
    const key = `field:${flat.field.id}`
    for (const col of tableColumns) {
      const flags = scalarNumeric(col.type)
      scalarHeaders(`${flat.prefix}.${col.key}`, col.type).forEach((header, i) => {
        headers.push(header)
        numeric.push(flags[i] ?? false)
        owners.push({ columnKey: key, header })
      })
    }
  }

  const rowsFor = (doc: Document): string[][] => {
    const base = readers.flatMap((read) => read(doc))
    if (!flat) return [base]
    const table = doc.values[flat.field.id]
    const rows = table?.type === 'table' ? table.rows : []
    if (rows.length === 0) return [[...base, ...tableColumns.flatMap((col) => scalarCells(undefined, col.type))]]
    return rows.map((row) => [...base, ...tableColumns.flatMap((col) => scalarCells(row.cells[col.id], col.type))])
  }

  return { headers, numeric, rowsFor, owners, separate }
}
