import type { FieldAction, FieldDef } from '@/lib/mock/types'
import { nodeCellColumnIds, nodeFieldIds, type ExprNode } from './expr-node'
import { buildRowScope, tableColumns, type RowScope } from './row-scope'

/** What an action applies to: the whole document, or every row of one table field. */
export type ActionScope = { kind: 'document' } | { kind: 'row'; tableFieldId: string }

export const DOCUMENT_SCOPE: ActionScope = { kind: 'document' }

/**
 * What the expressions of an action may read; undefined for a document-level action.
 * `columnId`: the target column of a computed column ('' = not chosen yet), undefined for a check.
 */
export const rowScopeOf = (
  scope: ActionScope,
  id: string,
  columnId: string | undefined,
  actions: readonly FieldAction[],
): RowScope | undefined => (scope.kind === 'row' ? buildRowScope(scope.tableFieldId, actions, id, columnId) : undefined)

/** Whether a half-built side still makes sense in a scope (no cells of another table, no computed fields in a row). */
export const fitsScope = (
  node: ExprNode,
  scope: ActionScope,
  fields: readonly FieldDef[],
  actions: readonly FieldAction[],
  id: string,
): boolean => {
  const cells = nodeCellColumnIds(node)
  if (scope.kind === 'document') return cells.length === 0
  const own = new Set(tableColumns(fields, scope.tableFieldId).map((c) => c.id))
  const { computedFieldIds } = buildRowScope(scope.tableFieldId, actions, id)
  return cells.every((columnId) => own.has(columnId)) && !nodeFieldIds(node).some((f) => computedFieldIds.has(f))
}
