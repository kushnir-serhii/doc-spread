import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import { isLowConfidence } from '@/lib/fields/confidence'
import type { AnyExtractedValue, ColumnDef, FieldValue, TableValue } from '@/lib/mock/types'

type TableRow = TableValue['rows'][number]

export const isCell = (value: FieldValue): value is AnyExtractedValue => value.type !== 'table'

/** A blank cell for a column. A column is never a table, so the fallback is only there for the type checker. */
export const emptyCell = (column: ColumnDef): AnyExtractedValue => {
  const blank = FIELD_TYPE_META[column.type].empty()
  return isCell(blank) ? blank : { type: 'text', value: null, confidence: 0 }
}

/** The row's cell, or a blank one when the row predates the column. */
export const cellOf = (row: TableRow, column: ColumnDef): AnyExtractedValue => row.cells[column.id] ?? emptyCell(column)

export const addRow = (table: TableValue, columns: ColumnDef[]): TableValue => ({
  ...table,
  rows: [...table.rows, { id: crypto.randomUUID(), cells: Object.fromEntries(columns.map((c) => [c.id, emptyCell(c)])) }],
})

export const removeRow = (table: TableValue, rowId: string): TableValue => ({
  ...table,
  rows: table.rows.filter((row) => row.id !== rowId),
})

/** An edited cell has been looked at: confidence 1. */
export const setCell = (table: TableValue, rowId: string, columnId: string, cell: AnyExtractedValue): TableValue => ({
  ...table,
  rows: table.rows.map((row) =>
    row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: { ...cell, confidence: 1 } } } : row,
  ),
})

export const confirmTable = (table: TableValue): TableValue => ({
  ...table,
  rows: table.rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(Object.entries(row.cells).map(([id, cell]) => [id, { ...cell, confidence: 1 }])),
  })),
})

export const hasLowCell = (table: TableValue): boolean =>
  table.rows.some((row) => Object.values(row.cells).some((cell) => isLowConfidence(cell.confidence)))

export type CellChange = (rowId: string, columnId: string, next: AnyExtractedValue) => void

/** Amounts are right-aligned with tabular numbers. */
export const isAmountColumn = (column: ColumnDef) => column.type === 'money' || column.type === 'number'
