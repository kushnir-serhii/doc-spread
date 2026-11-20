import { scalarCells, scalarHeaders } from './cells.js'
import { resolveTableColumns, resolveTableModes } from './mapping.js'
import type { Cell, ColumnDef, ExportColumnMapping, ExportDocument, ExportFormat, FieldDef, Sheet } from './types.js'

// Ported from apps/web/src/features/export/export-plan.ts: the same columns, headers, table modes and row rules
// (specs 009 and 018). Difference: computed fields and columns are exported as stored; the web app recomputes the
// ones that were not stored for documents approved earlier, the API does not (they are stored on approval today).

const includedTableColumns = (field: FieldDef, mapping: ExportColumnMapping): { header: string; def: ColumnDef }[] =>
  resolveTableColumns(mapping, field).flatMap((col) => {
    const def = field.columns?.find((c) => c.id === col.columnId)
    return def && col.include ? [{ header: col.header.trim() || def.key, def }] : []
  })

const tableRows = (doc: ExportDocument, field: FieldDef) => {
  const table = doc.values[field.id]
  return table?.type === 'table' ? table.rows : []
}

/**
 * The sheets of an export: the main sheet first (one row per document, or per table row for a flattened table),
 * then one sheet per separate table (Document ID first). A CSV with separate tables becomes a zip of files.
 */
export const buildSheets = (
  typeName: string,
  fields: FieldDef[],
  mapping: ExportColumnMapping,
  format: ExportFormat,
  documents: ExportDocument[],
): Sheet[] => {
  const modes = resolveTableModes(fields, mapping, format)
  const forced = [...modes.values()].includes('separate')
  const idColumn = mapping.columns.find((c) => c.source.kind === 'builtin' && c.source.id === 'document_id')
  const idHeader = idColumn?.header.trim() || 'Document ID'

  const headers: string[] = []
  const readers: ((doc: ExportDocument) => Cell[])[] = []
  const separate: { name: string; field: FieldDef }[] = []
  let flat: FieldDef | undefined

  for (const column of mapping.columns) {
    const header = column.header.trim()
    const { source } = column
    if (source.kind === 'builtin') {
      const id = source.id
      if (!column.include && !(id === 'document_id' && forced)) continue
      headers.push(header || id)
      readers.push((doc) => {
        const text = id === 'document_id' ? doc.id : doc.fileName
        return [{ text, value: text }]
      })
      continue
    }
    const { fieldId } = source
    const field = fields.find((f) => f.id === fieldId)
    if (!field || !column.include) continue
    if (field.type === 'table') {
      if (modes.get(field.id) === 'flatten') flat = field
      else separate.push({ name: header || field.key, field })
      continue
    }
    const fieldType = field.type
    headers.push(...scalarHeaders(header || field.key, fieldType))
    readers.push((doc) => scalarCells(doc.values[field.id], fieldType))
  }

  const flatColumns = flat ? includedTableColumns(flat, mapping) : []
  for (const { header, def } of flatColumns) headers.push(...scalarHeaders(header, def.type))

  const mainRows = documents.flatMap((doc): Cell[][] => {
    const base = readers.flatMap((read) => read(doc))
    if (!flat) return [base]
    const rows = tableRows(doc, flat)
    if (rows.length === 0) return [[...base, ...flatColumns.flatMap(({ def }) => scalarCells(undefined, def.type))]]
    return rows.map((row) => [...base, ...flatColumns.flatMap(({ def }) => scalarCells(row.cells[def.id], def.type))])
  })
  const sheets: Sheet[] = [{ name: typeName, headers, rows: mainRows }]

  for (const { name, field } of separate) {
    const columns = includedTableColumns(field, mapping)
    sheets.push({
      name,
      headers: [idHeader, ...columns.flatMap(({ header, def }) => scalarHeaders(header, def.type))],
      rows: documents.flatMap((doc) =>
        tableRows(doc, field).map((row): Cell[] => [
          { text: doc.id, value: doc.id },
          ...columns.flatMap(({ def }) => scalarCells(row.cells[def.id], def.type)),
        ]),
      ),
    })
  }
  return sheets
}
