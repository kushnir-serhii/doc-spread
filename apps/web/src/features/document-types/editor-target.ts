import type { ColumnDef, FieldDef } from '@/lib/mock/types'

/** What is selected in the builder: a field, a column of a table field, or nothing. */
export type Selection =
  | { kind: 'field'; fieldId: string }
  | { kind: 'column'; fieldId: string; columnId: string }
  | null

/** A selection resolved against the draft. */
export type EditorTarget =
  | { kind: 'field'; field: FieldDef }
  | { kind: 'column'; table: FieldDef; column: ColumnDef }

export const resolveSelection = (selection: Selection, fields: readonly FieldDef[]): EditorTarget | null => {
  if (selection === null) return null
  const field = fields.find((f) => f.id === selection.fieldId)
  if (!field) return null
  if (selection.kind === 'field') return { kind: 'field', field }
  const column = field.columns?.find((c) => c.id === selection.columnId)
  return column ? { kind: 'column', table: field, column } : null
}

/** Handlers the builder gives the editor; the ones that change the selection live there. */
export interface EditorActions {
  onDuplicateField: (fieldId: string) => void
  onDeleteField: (fieldId: string) => void
  onAddColumn: (fieldId: string) => void
  onDuplicateColumn: (fieldId: string, columnId: string) => void
  onDeleteColumn: (fieldId: string, columnId: string) => void
}
