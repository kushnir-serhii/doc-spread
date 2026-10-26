import { useState } from 'react'
import { useUpdateDocumentValues } from '@/lib/api'
import type { Document, FieldValue } from '@/lib/mock/types'

type Values = Record<string, FieldValue>

// Plain data in a stable key order, so JSON is a safe deep comparison.
const differs = (a: FieldValue | undefined, b: FieldValue | undefined) => JSON.stringify(a) !== JSON.stringify(b)

/** A value a person has looked at is verified: confidence 1. */
const verified = (value: FieldValue): FieldValue => (value.type === 'table' ? value : { ...value, confidence: 1 })

/** The local draft of a document's values: edit, confirm, save the changed fields only. */
export const useReviewDraft = (doc: Document) => {
  const [draft, setDraft] = useState<Values>(doc.values)
  // what the server has: the document's values, then whatever was last saved
  const [saved, setSaved] = useState<Values>(doc.values)
  const mutation = useUpdateDocumentValues()

  const changedIds = Object.keys(draft).filter((id) => differs(draft[id], saved[id]))

  /** `verify: false` keeps the value's own confidence, e.g. when part of it was assumed and still needs a check. */
  const setValue = (fieldId: string, next: FieldValue, { verify = true }: { verify?: boolean } = {}) => {
    if (!mutation.isIdle) mutation.reset()
    setDraft((current) => ({ ...current, [fieldId]: verify ? verified(next) : next }))
  }
  const confirm = (fieldId: string) => {
    const current = draft[fieldId]
    if (current) setValue(fieldId, current)
  }
  /** Resolves once the changed fields are stored; rejects with the mutation's error. */
  const saveNow = async () => {
    const patch: Values = {}
    for (const id of changedIds) {
      const value = draft[id]
      if (value) patch[id] = value
    }
    const snapshot = draft
    await mutation.mutateAsync({ id: doc.id, patch })
    setSaved(snapshot)
  }
  // the error is shown from `mutation`, so the button handler has nothing to do with it
  const save = () => void saveNow().catch(() => undefined)

  return { draft, setValue, confirm, save, saveNow, dirty: changedIds.length > 0, mutation }
}
