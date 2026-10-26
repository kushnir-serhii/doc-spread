import { useState, type Dispatch } from 'react'
import type { ViewerSelection } from '@/features/documents/viewer/viewer-types'
import { guessFieldType } from '@/lib/fields/guess-field-type'
import { parseFieldValue } from '@/lib/fields/parse-field-value'
import type { FieldValue, ScalarFieldType } from '@/lib/mock/types'
import type { BuilderAction } from '../type-draft-reducer'
import { replaceExample } from './replace-example'
import type { ProposalItem } from './use-proposal-review'

/** One field at a time: pointing, a failed parse, a type change on offer, or the warning of a fix. */
export type PointAgainState =
  | { step: 'idle' }
  | { step: 'pointing'; fieldId: string }
  | { step: 'failed'; fieldId: string; reason: string }
  | { step: 'offer'; fieldId: string; to: ScalarFieldType; selection: ViewerSelection }
  | { step: 'warned'; fieldId: string; warning: string }

const IDLE: PointAgainState = { step: 'idle' }

/** "Point again": replaces the example of a listed field for this document, parsed into the field's type. */
export const usePointAgain = (
  documentId: string,
  items: ProposalItem[],
  values: Record<string, FieldValue> | undefined,
  dispatch: Dispatch<BuilderAction>,
) => {
  const [state, setState] = useState<PointAgainState>(IDLE)

  const itemOf = (fieldId: string) => items.find((i) => i.field.id === fieldId)
  const focusButton = (fieldId: string) =>
    document.querySelector<HTMLElement>(`[data-point-again="${fieldId}"]`)?.focus()
  const exampleOf = (s: ViewerSelection) => ({ documentId, page: s.page, bbox: s.bbox, text: s.text })

  const select = (selection: ViewerSelection) => {
    if (state.step !== 'pointing') return
    const item = itemOf(state.fieldId)
    const field = item?.field
    if (!item || !field || field.type === 'table') return setState(IDLE)
    const parsed = parseFieldValue({ type: field.type, options: field.options }, selection.text, values?.[field.id])
    if (parsed.ok) {
      replaceExample(dispatch, item, exampleOf(selection))
      setState(parsed.warning ? { step: 'warned', fieldId: field.id, warning: parsed.warning } : IDLE)
    } else {
      const better = guessFieldType(selection.text, field.type)
      setState(
        better
          ? { step: 'offer', fieldId: field.id, to: better, selection }
          : { step: 'failed', fieldId: field.id, reason: parsed.reason },
      )
    }
    focusButton(field.id)
  }

  return {
    state,
    pointing: state.step === 'pointing',
    start: (fieldId: string) => setState({ step: 'pointing', fieldId }),
    cancel: () => {
      if (state.step !== 'idle') focusButton(state.fieldId)
      setState(IDLE)
    },
    select,
    changeType: () => {
      if (state.step !== 'offer') return
      const item = itemOf(state.fieldId)
      if (item) replaceExample(dispatch, item, exampleOf(state.selection), state.to)
      setState(IDLE)
      focusButton(state.fieldId)
    },
  }
}

export type PointAgain = ReturnType<typeof usePointAgain>
