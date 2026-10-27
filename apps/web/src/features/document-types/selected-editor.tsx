import type { Dispatch } from 'react'
import { getComputeActions, getRowComputeActions } from '@/lib/fields/computed-fields'
import { describeExpr } from '@/lib/fields/evaluate'
import { FIELD_TYPES, type FieldAction, type FieldDef } from '@/lib/mock/types'
import type { EditorActions, EditorTarget } from './editor-target'
import { FieldEditor } from './field-editor'
import { getKeyError, isScalarFieldType } from './field-key'
import { GroupByToggle } from './group-by-toggle'
import { canGroupBy } from './list-settings'
import { TableColumnsSection } from './table-columns-section'
import type { ColumnOp } from './type-draft-columns'
import type { BuilderAction } from './type-draft-reducer'
import { splitEditorIssues, type ValidationIssue } from './validate-draft'

const columnAction = (fieldId: string, op: ColumnOp): BuilderAction => ({ type: 'column', fieldId, op })

const COLUMN_TYPES = FIELD_TYPES.filter(isScalarFieldType)

interface SelectedEditorProps extends EditorActions {
  target: EditorTarget
  fields: FieldDef[]
  /** the type's actions: a field computed by one shows "Computed by …" */
  fieldActions: FieldAction[]
  /** opens the action's editor; leave out where there is none */
  onOpenAction?: (actionId: string) => void
  dispatch: Dispatch<BuilderAction>
  /** Problems of the selected item to show; empty until a Save was tried. */
  issues: ValidationIssue[]
}

/** Wires the shared FieldEditor to a field or to a column of a table. */
export const SelectedEditor = ({ target, fields, fieldActions, onOpenAction, dispatch, issues, ...actions }: SelectedEditorProps) => {
  const shown = splitEditorIssues(issues)
  if (target.kind === 'field') {
    const { field } = target
    const computed = getComputeActions({ actions: fieldActions }).get(field.id)
    return (
      <FieldEditor
        field={field}
        types={FIELD_TYPES}
        keyError={getKeyError(field, fields)}
        {...shown}
        deleteLabel="Delete field"
        computedBy={computed && { text: describeExpr(computed.expr, fields), onOpen: onOpenAction && (() => onOpenAction(computed.id)) }}
        onLabelChange={(label) => dispatch({ type: 'setFieldLabel', id: field.id, label })}
        onKeyChange={(key) => dispatch({ type: 'setFieldKey', id: field.id, key })}
        onPatch={(patch) => dispatch({ type: 'updateField', id: field.id, patch })}
        onTypeChange={(fieldType) => dispatch({ type: 'changeFieldType', id: field.id, fieldType })}
        onDuplicate={() => actions.onDuplicateField(field.id)}
        onDelete={() => actions.onDeleteField(field.id)}
      >
        {canGroupBy(field.type) && (
          <GroupByToggle
            checked={field.groupable === true}
            onChange={(groupable) => dispatch({ type: 'setGroupable', id: field.id, groupable })}
          />
        )}
        {field.type === 'table' && (
          <TableColumnsSection table={field} onAddColumn={() => actions.onAddColumn(field.id)} />
        )}
      </FieldEditor>
    )
  }

  const { table, column } = target
  const computedColumn = getRowComputeActions({ actions: fieldActions }).get(table.id)?.get(column.id)
  const run = (op: ColumnOp) => dispatch(columnAction(table.id, op))
  return (
    <FieldEditor
      field={column}
      types={COLUMN_TYPES}
      heading={`Column of ${table.label}`}
      keyError={getKeyError(column, table.columns ?? [], 'column')}
      {...shown}
      deleteLabel="Delete column"
      computedBy={
        computedColumn && {
          text: describeExpr(computedColumn.expr, fields),
          onOpen: onOpenAction && (() => onOpenAction(computedColumn.id)),
        }
      }
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
