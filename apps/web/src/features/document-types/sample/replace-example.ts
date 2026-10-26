import type { Dispatch } from 'react'
import type { FieldExample, ScalarFieldType } from '@/lib/mock/types'
import type { BuilderAction } from '../type-draft-reducer'
import type { ProposalItem } from './use-proposal-review'

/**
 * Replaces the field's example for the example's document, optionally changing the field's type first.
 * A proposed field is accepted by this.
 */
export const replaceExample = (
  dispatch: Dispatch<BuilderAction>,
  item: ProposalItem,
  example: FieldExample,
  newType?: ScalarFieldType,
) => {
  const examples = [...item.field.examples.filter((e) => e.documentId !== example.documentId), example]
  if (item.status === 'accepted') {
    if (newType) dispatch({ type: 'changeFieldType', id: item.field.id, fieldType: newType })
    dispatch({ type: 'updateField', id: item.field.id, patch: { examples } })
    return
  }
  const field = { ...item.field, examples }
  if (newType) {
    field.type = newType
    // options exist only on select
    if (newType === 'select') field.options = []
    else delete field.options
  }
  dispatch({ type: 'addFields', fields: [field] })
}
