import { useState, type Dispatch, type RefObject } from 'react'
import type { ViewerSelection } from '@/features/documents/viewer/viewer-types'
import { useSuggestField } from '@/lib/api'
import type { FieldDef, FieldExample, ScalarFieldType } from '@/lib/mock/types'
import { slugifyKey } from '../field-key'
import type { BuilderAction } from '../type-draft-reducer'
import { replaceExample } from './replace-example'
import { findOverlappingItem } from './selection-overlap'
import type { ProposalItem } from './use-proposal-review'

export interface SuggestionEdits {
  label: string
  type: ScalarFieldType
  hint: string
}

/**
 * "Point to add": pointing on the viewer, the suggestion for the confirmed selection, then adding
 * a field to the draft (or replacing the example of the field the selection overlaps).
 */
export const usePointToAdd = (
  documentId: string,
  items: ProposalItem[],
  dispatch: Dispatch<BuilderAction>,
  /** The "Point to add" button: focus returns to it when pointing ends. */
  triggerRef: RefObject<HTMLButtonElement | null>,
) => {
  const [pointing, setPointing] = useState(false)
  const [selection, setSelection] = useState<ViewerSelection | null>(null)
  const [notice, setNotice] = useState('')
  const suggest = useSuggestField()

  const toInput = (s: ViewerSelection) => ({ documentId, page: s.page, bbox: s.bbox, text: s.text })
  const finish = (message: string) => {
    suggest.reset()
    setSelection(null)
    setPointing(false)
    setNotice(message)
    triggerRef.current?.focus()
  }

  return {
    pointing,
    selection,
    suggest,
    notice,
    overlap: findOverlappingItem(items, documentId, selection),
    toggle: () => {
      if (pointing) return finish('')
      setNotice('')
      setPointing(true)
    },
    cancel: () => finish(''),
    select: (s: ViewerSelection) => {
      setPointing(false)
      setSelection(s)
      suggest.mutate(toInput(s))
    },
    retry: () => {
      if (selection) suggest.mutate(toInput(selection))
    },
    add: (edits: SuggestionEdits) => {
      if (!suggest.data) return
      const field: FieldDef = {
        id: crypto.randomUUID(),
        key: slugifyKey(edits.label) || suggest.data.key,
        label: edits.label.trim(),
        type: edits.type,
        required: false,
        hint: edits.hint.trim(),
        examples: [suggest.data.example],
      }
      dispatch({ type: 'addFields', fields: [field] })
      finish(`Added "${field.label}".`)
    },
    /** Replaces the overlapped field's example for this document with the selection. */
    fix: (item: ProposalItem) => {
      if (!selection) return
      const example: FieldExample = suggest.data?.example ?? {
        documentId,
        page: selection.page,
        bbox: selection.bbox,
        text: selection.text,
      }
      replaceExample(dispatch, item, example)
      finish(`Fixed "${item.field.label}".`)
    },
  }
}
