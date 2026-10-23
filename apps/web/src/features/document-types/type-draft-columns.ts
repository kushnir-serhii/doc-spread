import type { ColumnDef, FieldDef, ScalarFieldType } from '@/lib/mock/types'
import { sanitizeKey, slugifyKey, uniqueKey } from './field-key'
import { moveItem, type BuilderState, type FieldPatch } from './type-draft'

/** An edit to one column of a table field; `id` is the column's id. */
export type ColumnOp =
  | { kind: 'add'; id: string }
  | { kind: 'duplicate'; id: string; newId: string }
  | { kind: 'delete'; id: string }
  | { kind: 'move'; id: string; direction: 'up' | 'down' }
  | { kind: 'setLabel'; id: string; label: string }
  | { kind: 'setKey'; id: string; key: string }
  | { kind: 'update'; id: string; patch: FieldPatch }
  | { kind: 'changeType'; id: string; columnType: ScalarFieldType }

const withColumns = (state: BuilderState, fieldId: string, update: (columns: ColumnDef[]) => ColumnDef[]) => ({
  ...state,
  draft: {
    ...state.draft,
    fields: state.draft.fields.map((field): FieldDef =>
      field.id === fieldId && field.columns ? { ...field, columns: update(field.columns) } : field,
    ),
  },
})

const mapColumn = (state: BuilderState, fieldId: string, id: string, update: (column: ColumnDef) => ColumnDef) =>
  withColumns(state, fieldId, (columns) => columns.map((c) => (c.id === id ? update(c) : c)))

/** Keeps label, hint and required; options exist only on select. */
const retypeColumn = (column: ColumnDef, columnType: ScalarFieldType): ColumnDef => {
  if (column.type === columnType) return column
  const { id, key, label, required, hint, examples } = column
  return {
    id,
    key,
    label,
    required,
    examples,
    type: columnType,
    ...(hint !== undefined && { hint }),
    ...(columnType === 'select' && { options: [] }),
  }
}

const keysExcept = (columns: ColumnDef[], id: string) => columns.filter((c) => c.id !== id).map((c) => c.key)

export const columnsReducer = (state: BuilderState, fieldId: string, op: ColumnOp): BuilderState => {
  const columns = state.draft.fields.find((f) => f.id === fieldId)?.columns
  if (!columns) return state
  switch (op.kind) {
    case 'add': {
      const column: ColumnDef = {
        id: op.id,
        key: uniqueKey('new_column', columns.map((c) => c.key)),
        label: 'New column',
        type: 'text',
        required: false,
        examples: [],
      }
      return withColumns(state, fieldId, (list) => [...list, column])
    }
    case 'duplicate': {
      const index = columns.findIndex((c) => c.id === op.id)
      if (index === -1) return state
      const source = columns[index]
      const copy: ColumnDef = {
        ...source,
        id: op.newId,
        label: `${source.label} (copy)`,
        key: uniqueKey(source.key === '' ? 'column' : source.key, columns.map((c) => c.key)),
        examples: [],
        ...(source.options && { options: [...source.options] }),
      }
      const next = withColumns(state, fieldId, (list) => list.toSpliced(index + 1, 0, copy))
      return { ...next, keyTouched: [...state.keyTouched, op.newId] }
    }
    case 'delete':
      return {
        ...withColumns(state, fieldId, (list) => list.filter((c) => c.id !== op.id)),
        keyTouched: state.keyTouched.filter((id) => id !== op.id),
      }
    case 'move':
      return withColumns(state, fieldId, (list) => moveItem(list, op.id, op.direction))
    case 'setLabel':
      return mapColumn(state, fieldId, op.id, (column) => ({
        ...column,
        label: op.label,
        ...(!state.keyTouched.includes(column.id) && {
          key: uniqueKey(slugifyKey(op.label), keysExcept(columns, column.id)),
        }),
      }))
    case 'setKey': {
      const next = mapColumn(state, fieldId, op.id, (column) => ({ ...column, key: sanitizeKey(op.key) }))
      return state.keyTouched.includes(op.id) ? next : { ...next, keyTouched: [...state.keyTouched, op.id] }
    }
    case 'update':
      return mapColumn(state, fieldId, op.id, (column) => ({ ...column, ...op.patch }))
    case 'changeType':
      return mapColumn(state, fieldId, op.id, (column) => retypeColumn(column, op.columnType))
    default: {
      const unreachable: never = op
      return unreachable
    }
  }
}
