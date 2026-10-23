import type { Dispatch } from 'react'
import { FIELD_TYPES, type FieldDef } from '@/lib/mock/types'
import type { EditorActions, EditorTarget } from './editor-target'
import { FieldEditor } from './field-editor'
import { getKeyError, isScalarFieldType } from './field-key'
import { TableColumnsSection } from './table-columns-section'
import type { ColumnOp } from './type-draft-columns'
import type { BuilderAction } from './type-draft-reducer'

const columnAction = (fieldId: string, op: ColumnOp): BuilderAction => ({ type: 'column', fieldId, op })

const COLUMN_TYPES = FIELD_TYPES.filter(isScalarFieldType)

interface SelectedEditorProps extends EditorActions {
  target: EditorTarget
  fields: FieldDef[]
  dispatch: Dispatch<BuilderAction>
}

/** Wires the shared FieldEditor to a field or to a column of a table. */
export const SelectedEditor = ({ target, fields, dispatch, ...actions }: SelectedEditorProps) => {
  if (target.kind === 'field') {
    const { field } = target
    return (
      <FieldEditor
        field={field}
        types={FIELD_TYPES}
        keyError={getKeyError(field, fields)}
        deleteLabel="Delete field"
        onLabelChange={(label) => dispatch({ type: 'setFieldLabel', id: field.id, label })}
        onKeyChange={(key) => dispatch({ type: 'setFieldKey', id: field.id, key })}
        onPatch={(patch) => dispatch({ type: 'updateField', id: field.id, patch })}
        onTypeChange={(fieldType) => dispatch({ type: 'changeFieldType', id: field.id, fieldType })}
        onDuplicate={() => actions.onDuplicateField(field.id)}
        onDelete={() => actions.onDeleteField(field.id)}
      >
        {field.type === 'table' && (
          <TableColumnsSection table={field} onAddColumn={() => actions.onAddColumn(field.id)} />
        )}
      </FieldEditor>
    )
  }

  const { table, column } = target
  const run = (op: ColumnOp) => dispatch(columnAction(table.id, op))
  return (
    <FieldEditor
      field={column}
      types={COLUMN_TYPES}
      heading={`Column of ${table.label}`}
      keyError={getKeyError(column, table.columns ?? [], 'column')}
      deleteLabel="Delete column"
      onLabelChange={(label) => run({ kind: 'setLabel', id: column.id, label })}
      onKeyChange={(key) => run({ kind: 'setKey', id: column.id, key })}
      onPatch={(patch) => run({ kind: 'update', id: column.id, patch })}
      onTypeChange={(type) => {
        if (isScalarFieldType(type)) run({ kind: 'changeType', id: column.id, columnType: type })
      }}
      onDuplicate={() => actions.onDuplicateColumn(table.id, column.id)}
      onDelete={() => actions.onDeleteColumn(table.id, column.id)}
    />
  )
}
