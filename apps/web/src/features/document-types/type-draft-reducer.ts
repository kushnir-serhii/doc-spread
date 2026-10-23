import type { FieldDef, FieldType } from '@/lib/mock/types'
import { sanitizeKey, slugifyKey, uniqueKey } from './field-key'
import { canBeTitle, canGroupBy, MAX_LIST_COLUMNS } from './list-settings'
import { moveItem, type BuilderState, type FieldPatch, type TypeDraft } from './type-draft'
import { columnsReducer, type ColumnOp } from './type-draft-columns'

export type BuilderAction =
  | { type: 'setName'; name: string }
  | { type: 'setDescription'; description: string }
  | { type: 'addField'; id: string }
  | { type: 'duplicateField'; id: string; newId: string }
  | { type: 'deleteField'; id: string }
  | { type: 'moveField'; id: string; direction: 'up' | 'down' }
  | { type: 'setFieldLabel'; id: string; label: string }
  | { type: 'setFieldKey'; id: string; key: string }
  | { type: 'updateField'; id: string; patch: FieldPatch }
  | { type: 'changeFieldType'; id: string; fieldType: FieldType }
  | { type: 'setGroupable'; id: string; groupable: boolean }
  | { type: 'setTitleField'; id: string | null }
  | { type: 'toggleListColumn'; id: string }
  | { type: 'moveListColumn'; id: string; direction: 'up' | 'down' }
  | { type: 'column'; fieldId: string; op: ColumnOp }

export const createBuilderState = (draft: TypeDraft): BuilderState => ({
  draft,
  // Saved and template keys are never rewritten by renaming a label.
  keyTouched: draft.fields.flatMap((field) => [field.id, ...(field.columns ?? []).map((c) => c.id)]),
})

const keysExcept = (fields: FieldDef[], id: string) => fields.filter((f) => f.id !== id).map((f) => f.key)

const mapField = (state: BuilderState, id: string, update: (field: FieldDef) => FieldDef): BuilderState => ({
  ...state,
  draft: { ...state.draft, fields: state.draft.fields.map((f) => (f.id === id ? update(f) : f)) },
})

/** Keeps label, hint and required; options and columns exist only on their own type. */
const retype = (field: FieldDef, fieldType: FieldType): FieldDef => {
  if (field.type === fieldType) return field
  const { id, key, label, required, hint, groupable, examples } = field
  return {
    id,
    key,
    label,
    required,
    examples,
    type: fieldType,
    ...(hint !== undefined && { hint }),
    ...(fieldType === 'select' && { options: [] }),
    ...(fieldType === 'table' && { columns: [] }),
    ...(groupable && canGroupBy(fieldType) && { groupable }),
  }
}

const duplicate = (state: BuilderState, id: string, newId: string): BuilderState => {
  const { fields } = state.draft
  const index = fields.findIndex((f) => f.id === id)
  if (index === -1) return state
  const source = fields[index]
  const copy: FieldDef = {
    ...source,
    id: newId,
    label: `${source.label} (copy)`,
    key: uniqueKey(source.key === '' ? 'field' : source.key, fields.map((f) => f.key)),
    examples: [],
    ...(source.options && { options: [...source.options] }),
    ...(source.columns && {
      columns: source.columns.map((c) => ({ ...c, id: `${newId}-${c.id}`, examples: [] })),
    }),
  }
  const copiedIds = (copy.columns ?? []).map((c) => c.id)
  return {
    draft: { ...state.draft, fields: fields.toSpliced(index + 1, 0, copy) },
    keyTouched: [...state.keyTouched, newId, ...copiedIds],
  }
}

export const builderReducer = (state: BuilderState, action: BuilderAction): BuilderState => {
  const { draft } = state
  switch (action.type) {
    case 'setName':
      return { ...state, draft: { ...draft, name: action.name } }
    case 'setDescription':
      return { ...state, draft: { ...draft, description: action.description } }
    case 'addField': {
      const field: FieldDef = {
        id: action.id,
        key: uniqueKey('new_field', draft.fields.map((f) => f.key)),
        label: 'New field',
        type: 'text',
        required: false,
        examples: [],
      }
      return { ...state, draft: { ...draft, fields: [...draft.fields, field] } }
    }
    case 'duplicateField':
      return duplicate(state, action.id, action.newId)
    case 'deleteField': {
      const deleted = draft.fields.find((f) => f.id === action.id)
      return {
        keyTouched: state.keyTouched.filter(
          (id) => id !== action.id && !deleted?.columns?.some((c) => c.id === id),
        ),
        draft: {
          ...draft,
          fields: draft.fields.filter((f) => f.id !== action.id),
          titleFieldId: draft.titleFieldId === action.id ? null : draft.titleFieldId,
          listColumnIds: draft.listColumnIds.filter((id) => id !== action.id),
        },
      }
    }
    case 'moveField':
      return { ...state, draft: { ...draft, fields: moveItem(draft.fields, action.id, action.direction) } }
    case 'setFieldLabel':
      return mapField(state, action.id, (field) => ({
        ...field,
        label: action.label,
        ...(!state.keyTouched.includes(field.id) && {
          key: uniqueKey(slugifyKey(action.label), keysExcept(draft.fields, field.id)),
        }),
      }))
    case 'setFieldKey': {
      const next = mapField(state, action.id, (field) => ({ ...field, key: sanitizeKey(action.key) }))
      return state.keyTouched.includes(action.id) ? next : { ...next, keyTouched: [...state.keyTouched, action.id] }
    }
    case 'updateField':
      return mapField(state, action.id, (field) => ({ ...field, ...action.patch }))
    case 'setGroupable':
      return mapField(state, action.id, (field) => ({
        ...field,
        groupable: (action.groupable && canGroupBy(field.type)) || undefined,
      }))
    case 'changeFieldType': {
      const next = mapField(state, action.id, (field) => retype(field, action.fieldType))
      // A title must stay a text-like field.
      return draft.titleFieldId === action.id && !canBeTitle(action.fieldType)
        ? { ...next, draft: { ...next.draft, titleFieldId: null } }
        : next
    }
    case 'setTitleField': {
      const field = draft.fields.find((f) => f.id === action.id)
      if (action.id !== null && (!field || !canBeTitle(field.type))) return state
      return { ...state, draft: { ...draft, titleFieldId: action.id } }
    }
    case 'toggleListColumn': {
      const chosen = draft.listColumnIds.includes(action.id)
      if (!chosen && (draft.listColumnIds.length >= MAX_LIST_COLUMNS || !draft.fields.some((f) => f.id === action.id)))
        return state
      const listColumnIds = chosen
        ? draft.listColumnIds.filter((id) => id !== action.id)
        : [...draft.listColumnIds, action.id]
      return { ...state, draft: { ...draft, listColumnIds } }
    }
    case 'moveListColumn': {
      const items = draft.listColumnIds.map((id) => ({ id }))
      const moved = moveItem(items, action.id, action.direction)
      return moved === items
        ? state
        : { ...state, draft: { ...draft, listColumnIds: moved.map((item) => item.id) } }
    }
    case 'column':
      return columnsReducer(state, action.fieldId, action.op)
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}
