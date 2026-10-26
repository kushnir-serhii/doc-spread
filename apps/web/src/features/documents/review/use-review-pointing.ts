import { useState, type RefObject } from 'react'
import type { ViewerMode, ViewerSelection } from '@/features/documents/viewer/viewer-types'
import { useAddFieldExample } from '@/lib/api'
import { parseFieldValue } from '@/lib/fields/parse-field-value'
import type { Document, DocumentType, FieldExample, FieldValue } from '@/lib/mock/types'

/** One field at a time: pointing, a failed parse, or a fix waiting for the "use as example" answer. */
export type PointingState =
  | { step: 'idle' }
  | { step: 'pointing'; fieldId: string }
  | { step: 'failed'; fieldId: string; reason: string }
  | { step: 'fixed'; fieldId: string; example: FieldExample; warning?: string }

export const IDLE: PointingState = { step: 'idle' }

/** Below LOW_CONFIDENCE, so a value with an assumed part stays flagged ("Check this value") until confirmed. */
const ASSUMED_CONFIDENCE = 0.5

interface UseReviewPointingArgs {
  doc: Document
  type: DocumentType
  draft: Record<string, FieldValue>
  setValue: (fieldId: string, next: FieldValue, options?: { verify?: boolean }) => void
  formRef: RefObject<HTMLElement | null>
}

/** Fix by pointing: the viewer picks words, they are parsed into the field's type, then an example may be offered. */
export const useReviewPointing = ({ doc, type, draft, setValue, formRef }: UseReviewPointingArgs) => {
  const [state, setState] = useState<PointingState>(IDLE)
  const addExample = useAddFieldExample()

  const focusButton = (fieldId: string) =>
    formRef.current?.querySelector<HTMLElement>(`[data-point-id="${fieldId}"]`)?.focus()
  const reset = () => {
    if (!addExample.isIdle) addExample.reset()
  }

  const start = (fieldId: string) => {
    reset()
    setState({ step: 'pointing', fieldId })
  }
  const cancel = () => {
    if (state.step === 'pointing') focusButton(state.fieldId)
    setState(IDLE)
  }
  const dismiss = () => {
    if (state.step !== 'idle') focusButton(state.fieldId)
    reset()
    setState(IDLE)
  }

  const select = (selection: ViewerSelection) => {
    if (state.step !== 'pointing') return
    const field = type.fields.find((f) => f.id === state.fieldId)
    if (!field || field.type === 'table') return setState(IDLE)
    const parsed = parseFieldValue({ type: field.type, options: field.options }, selection.text, draft[field.id])
    if (!parsed.ok) return setState({ step: 'failed', fieldId: field.id, reason: parsed.reason })
    const source = { page: selection.page, bbox: selection.bbox }
    // an assumed part (e.g. the currency) keeps the field flagged until someone confirms it
    if (parsed.warning) setValue(field.id, { ...parsed.value, confidence: ASSUMED_CONFIDENCE, source }, { verify: false })
    else setValue(field.id, { ...parsed.value, confidence: 1, source })
    // anchorText is left out: the backend works it out
    const example = { documentId: doc.id, page: selection.page, bbox: selection.bbox, text: selection.text }
    setState({ step: 'fixed', fieldId: field.id, example, warning: parsed.warning })
    focusButton(field.id)
  }

  const submitExample = () => {
    if (state.step !== 'fixed') return
    addExample.mutate({ typeId: type.id, fieldId: state.fieldId, example: state.example }, { onSuccess: () => setState(IDLE) })
  }

  const fieldLabel = type.fields.find((f) => f.id === (state.step === 'idle' ? null : state.fieldId))?.label
  const announcement = state.step === 'fixed' && fieldLabel ? `${fieldLabel} set from the document` : ''
  const mode: ViewerMode = state.step === 'pointing' ? 'select-words' : 'view'

  return {
    state,
    mode,
    announcement,
    typeName: type.name,
    exampleError: addExample.isError ? addExample.error.message : null,
    examplePending: addExample.isPending,
    start,
    cancel,
    dismiss,
    select,
    submitExample,
  }
}

export type ReviewPointing = ReturnType<typeof useReviewPointing>
