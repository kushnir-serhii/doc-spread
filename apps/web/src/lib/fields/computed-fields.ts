import type { ComputeAction, FieldAction, RowComputeAction } from '@/lib/mock/types'

interface HasActions {
  actions?: readonly FieldAction[]
}

/** The compute actions of a type, one per target field (the first wins if a field has several). */
export const getComputeActions = ({ actions = [] }: HasActions): Map<string, ComputeAction> => {
  const byField = new Map<string, ComputeAction>()
  for (const action of actions) {
    if (action.kind === 'compute' && !byField.has(action.fieldId)) byField.set(action.fieldId, action)
  }
  return byField
}

/** A field is computed when a compute action targets it; there is no flag on the field itself. */
export const getComputedFieldIds = (type: HasActions): Set<string> => new Set(getComputeActions(type).keys())

export const isComputedField = (type: HasActions, fieldId: string): boolean => getComputeActions(type).has(fieldId)

/** Row compute actions by table field, then by target column (the first wins if a column has several). */
export const getRowComputeActions = ({ actions = [] }: HasActions): Map<string, Map<string, RowComputeAction>> => {
  const byTable = new Map<string, Map<string, RowComputeAction>>()
  for (const action of actions) {
    if (action.kind !== 'row_compute') continue
    const columns = byTable.get(action.tableFieldId) ?? new Map<string, RowComputeAction>()
    if (!columns.has(action.columnId)) columns.set(action.columnId, action)
    byTable.set(action.tableFieldId, columns)
  }
  return byTable
}

/** The computed columns of one table field (a row_compute action targets them; there is no flag on the column). */
export const getComputedColumnIds = (type: HasActions, tableFieldId: string): Set<string> =>
  new Set(getRowComputeActions(type).get(tableFieldId)?.keys())

/** Every computed column of the type, whatever the table (column ids are unique per type). */
export const getAllComputedColumnIds = (type: HasActions): Set<string> =>
  new Set([...getRowComputeActions(type).values()].flatMap((columns) => [...columns.keys()]))

export const isComputedColumn = (type: HasActions, tableFieldId: string, columnId: string): boolean =>
  getRowComputeActions(type).get(tableFieldId)?.has(columnId) ?? false
