import { useState } from 'react'
import { useUpdateDocumentValues } from '@/lib/api'
import { computeRowValues, stripComputedCells } from '@/lib/fields/evaluate-rows'
import { getRowComputeActions } from '@/lib/fields/computed-fields'
import { computeValues, resolveValues } from '@/lib/fields/run-checks'
import type { Document, DocumentType, FieldValue } from '@/lib/mock/types'

type Values = Record<string, FieldValue>

// Plain data in a stable key order, so JSON is a safe deep comparison.
const differs = (a: FieldValue | undefined, b: FieldValue | undefined) => JSON.stringify(a) !== JSON.stringify(b)

/** Computed values are always confidence 1, so only the value itself says whether they changed. */
const valueDiffers = (a: FieldValue | undefined, b: FieldValue | undefined) =>
  a?.type !== b?.type || JSON.stringify(a && a.type !== 'table' ? a.value : a) !== JSON.stringify(b && b.type !== 'table' ? b.value : b)

/** A value a person has looked at is verified: confidence 1. */
const verified = (value: FieldValue): FieldValue => (value.type === 'table' ? value : { ...value, confidence: 1 })

/**
 * The local draft of a document's values: edit, confirm, save the changed fields only.
 *
 * Computed fields are not state: they are derived from the draft on every render (`computed`) and merged
 * over it (`values`, what the form, the checks and the viewer see). `dirty` counts only what a person
 * edited, so a computed value that differs from the stored one never makes the document "unsaved" and
 * never trips the leave guard. They are stored along with the next save, and `needsSave` also covers
 * the case where only a computed value is out of date (so Approve stores it).
 *
 * Computed cells (computed columns of a table) work the same way: they are written into the table on every
 * render, and edits are detected on the table without them (`stripComputedCells`), so a table that only
 * differs in computed cells is stored with the next save but is never dirty. A table the user edited is
 * saved with the current computed cells too.
 */
export const useReviewDraft = (doc: Document, type: DocumentType) => {
  const [draft, setDraft] = useState<Values>(doc.values)
  // what the server has: the document's values, then whatever was last saved
  const [saved, setSaved] = useState<Values>(doc.values)
  const mutation = useUpdateDocumentValues()

  const computed = computeValues(type, draft)
  const rowOutcomes = computeRowValues(type, draft)
  // computed cells and computed fields written over the draft; what can't be computed is removed
  const values: Values = resolveValues(type, draft)
  const computedToStore: Values = {}
  for (const [id, outcome] of Object.entries(computed)) {
    if (outcome.ok && valueDiffers(outcome.value, saved[id])) computedToStore[id] = outcome.value
  }
  // edits are compared without computed cells: those are derived, not entered
  const draftBase = stripComputedCells(type, draft)
  const savedBase = stripComputedCells(type, saved)
  const changedIds = Object.keys(draftBase).filter((id) => !(id in computed) && differs(draftBase[id], savedBase[id]))
  const tablesToStore = new Set<string>(changedIds)
  for (const [tableId, columns] of getRowComputeActions(type)) {
    const table = values[tableId]
    if (table?.type !== 'table') continue
    const savedTable = saved[tableId]
    const savedRows = savedTable?.type === 'table' ? savedTable.rows : []
    const stale = table.rows.some((row) => {
      const savedCells = savedRows.find((r) => r.id === row.id)?.cells
      return [...columns.keys()].some((columnId) => valueDiffers(row.cells[columnId], savedCells?.[columnId]))
    })
    if (stale) tablesToStore.add(tableId)
  }
  const tableIdsToStore = [...tablesToStore].filter((id) => values[id]?.type === 'table' && getRowComputeActions(type).has(id))
  const needsSave = changedIds.length > 0 || Object.keys(computedToStore).length > 0 || tableIdsToStore.length > 0

  /** `verify: false` keeps the value's own confidence, e.g. when part of it was assumed and still needs a check. */
  const setValue = (fieldId: string, next: FieldValue, { verify = true }: { verify?: boolean } = {}) => {
    if (!mutation.isIdle) mutation.reset()
    setDraft((current) => ({ ...current, [fieldId]: verify ? verified(next) : next }))
  }
  const confirm = (fieldId: string) => {
    const current = values[fieldId]
    if (current) setValue(fieldId, current)
  }
  /** Resolves once the changed fields are stored; rejects with the mutation's error. */
  const saveNow = async () => {
    const patch: Values = { ...computedToStore }
    for (const id of changedIds) {
      const value = draft[id]
      if (value) patch[id] = value
    }
    // a table with computed columns is stored with its current computed cells
    for (const id of tableIdsToStore) {
      const value = values[id]
      if (value) patch[id] = value
    }
    const snapshot: Values = { ...draft, ...patch }
    await mutation.mutateAsync({ id: doc.id, patch })
    setSaved(snapshot)
  }
  // the error is shown from `mutation`, so the button handler has nothing to do with it
  const save = () => void saveNow().catch(() => undefined)

  return { values, computed, rowOutcomes, setValue, confirm, save, saveNow, dirty: changedIds.length > 0, needsSave, mutation }
}
