import type { Dispatch } from 'react'
import type { Selection } from './editor-target'
import type { BuilderAction } from './type-draft-reducer'

/** Edits that add or remove an item and move the selection with it (new ids are made here, not in the reducer). */
export const useDraftActions = (dispatch: Dispatch<BuilderAction>, select: (selection: Selection) => void) => ({
  addField: () => {
    const id = crypto.randomUUID()
    dispatch({ type: 'addField', id })
    select({ kind: 'field', fieldId: id })
  },
  duplicateField: (id: string) => {
    const newId = crypto.randomUUID()
    dispatch({ type: 'duplicateField', id, newId })
    select({ kind: 'field', fieldId: newId })
  },
  deleteField: (id: string) => {
    dispatch({ type: 'deleteField', id })
    select(null)
  },
  addColumn: (fieldId: string) => {
    const id = crypto.randomUUID()
    dispatch({ type: 'column', fieldId, op: { kind: 'add', id } })
    select({ kind: 'column', fieldId, columnId: id })
  },
  duplicateColumn: (fieldId: string, columnId: string) => {
    const newId = crypto.randomUUID()
    dispatch({ type: 'column', fieldId, op: { kind: 'duplicate', id: columnId, newId } })
    select({ kind: 'column', fieldId, columnId: newId })
  },
  // The table stays selected, so the editor does not go blank.
  deleteColumn: (fieldId: string, columnId: string) => {
    dispatch({ type: 'column', fieldId, op: { kind: 'delete', id: columnId } })
    select({ kind: 'field', fieldId })
  },
})
