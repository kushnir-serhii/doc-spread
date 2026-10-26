import type { ComputeAction, FieldAction } from '@/lib/mock/types'

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
