import { getAllComputedColumnIds, getComputedFieldIds } from '@/lib/fields/computed-fields'
import type { FieldAction, FieldDef } from '@/lib/mock/types'

/** What a row action may read: its table's cells, and not the computed document fields. */
export interface RowScope {
  tableFieldId: string
  /** computed document fields: a row action can't read them */
  computedFieldIds: ReadonlySet<string>
  /** computed columns whose lists a row compute can't read (its order would be undefined); empty for a row check */
  blockedListColumnIds: ReadonlySet<string>
}

/** The scope of a row check (`computeColumnId` undefined) or of a row compute that fills `computeColumnId`. */
export const buildRowScope = (
  tableFieldId: string,
  actions: readonly FieldAction[],
  selfId: string,
  computeColumnId?: string,
): RowScope => {
  const others = { actions: actions.filter((a) => a.id !== selfId) }
  return {
    tableFieldId,
    computedFieldIds: getComputedFieldIds(others),
    blockedListColumnIds:
      computeColumnId === undefined
        ? new Set()
        : new Set([...getAllComputedColumnIds(others), ...(computeColumnId === '' ? [] : [computeColumnId])]),
  }
}

/** The table's columns; empty when the table is gone. */
export const tableColumns = (fields: readonly FieldDef[], tableFieldId: string) =>
  fields.find((f) => f.id === tableFieldId && f.type === 'table')?.columns ?? []
