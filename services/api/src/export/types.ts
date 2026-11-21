// The part of the web app's document, type and export-mapping shapes the export needs. Ported (not imported):
// `services/api` must not depend on `apps/web`. Keep in step with `apps/web/src/lib/mock/types.ts`.

export type ScalarFieldType = 'text' | 'number' | 'money' | 'date' | 'boolean' | 'select' | 'email' | 'phone' | 'tax_id'

export interface ColumnDef {
  id: string
  key: string
  label: string
  type: ScalarFieldType
}

export interface FieldDef {
  id: string
  key: string
  label: string
  type: ScalarFieldType | 'table'
  /** type === 'table' */
  columns?: ColumnDef[]
}

export interface Money {
  /** minor units (cents) */
  amount: number
  /** ISO 4217 */
  currency: string
}

export interface ScalarValue {
  type: ScalarFieldType
  value: unknown
}

export interface TableValue {
  type: 'table'
  rows: { id: string; cells: Record<string, ScalarValue | undefined> }[]
}

export type FieldValue = ScalarValue | TableValue

export interface ExportDocument {
  id: string
  fileName: string
  values: Record<string, FieldValue | undefined>
}

export type ExportBuiltinColumn = 'document_id' | 'file_name'
export const EXPORT_BUILTIN_COLUMNS: readonly ExportBuiltinColumn[] = ['document_id', 'file_name']

export type ExportColumnSource = { kind: 'field'; fieldId: string } | { kind: 'builtin'; id: ExportBuiltinColumn }

export interface ExportColumn {
  source: ExportColumnSource
  include: boolean
  header: string
}

export type TableExportMode = 'separate' | 'flatten'

export interface ExportTableColumn {
  columnId: string
  include: boolean
  header: string
}

export interface ExportColumnMapping {
  columns: ExportColumn[]
  tables: Record<string, TableExportMode>
  tableColumns?: Record<string, ExportTableColumn[]>
}

export type ExportFormat = 'csv' | 'xlsx'

/** One cell: `text` is what a CSV holds, `value` what a spreadsheet cell holds (a real number, date or boolean). */
export interface Cell {
  text: string
  value: string | number | boolean | Date | null
  /** spreadsheet number format */
  format?: string
}

export interface Sheet {
  /** sheet name (xlsx) or file name (csv zip) */
  name: string
  headers: string[]
  rows: Cell[][]
}
