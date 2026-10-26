import { useState } from 'react'
import { useUpdateDocumentValues } from '@/lib/api'
import { computeValues } from '@/lib/fields/evaluate'
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
 */
export const useReviewDraft = (doc: Document, type: DocumentType) => {
  const [draft, setDraft] = useState<Values>(doc.values)
  // what the server has: the document's values, then whatever was last saved
  const [saved, setSaved] = useState<Values>(doc.values)
  const mutation = useUpdateDocumentValues()

  const computed = computeValues(type, draft)
  const values: Values = { ...draft }
  const computedToStore: Values = {}
  for (const [id, outcome] of Object.entries(computed)) {
    if (outcome.ok) {
      values[id] = outcome.value
      if (valueDiffers(outcome.value, saved[id])) computedToStore[id] = outcome.value
    } else {
      // a stored value of a field that can't be computed now would be stale
      delete values[id]
    }
  }
  const changedIds = Object.keys(draft).filter((id) => !(id in computed) && differs(draft[id], saved[id]))
  const needsSave = changedIds.length > 0 || Object.keys(computedToStore).length > 0

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
    const snapshot: Values = { ...draft, ...computedToStore }
    await mutation.mutateAsync({ id: doc.id, patch })
    setSaved(snapshot)
  }
  // the error is shown from `mutation`, so the button handler has nothing to do with it
  const save = () => void saveNow().catch(() => undefined)

  return { values, computed, setValue, confirm, save, saveNow, dirty: changedIds.length > 0, needsSave, mutation }
}
