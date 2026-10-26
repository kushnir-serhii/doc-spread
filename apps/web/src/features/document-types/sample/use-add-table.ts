import { useState, type Dispatch, type RefObject } from 'react'
import type { ViewerSelection } from '@/features/documents/viewer/viewer-types'
import { useSuggestTable } from '@/lib/api'
import type { FieldDef } from '@/lib/mock/types'
import { slugifyKey } from '../field-key'
import type { BuilderAction } from '../type-draft-reducer'

/**
 * "Add a table": drawing a rectangle over a table on the viewer, the guessed columns and preview,
 * then adding a `table` field to the draft. Columns are edited afterwards in the field editor.
 */
export const useAddTable = (
  documentId: string,
  dispatch: Dispatch<BuilderAction>,
  /** The "Add a table" button: focus returns to it when the flow ends. */
  triggerRef: RefObject<HTMLButtonElement | null>,
) => {
  const [pointing, setPointing] = useState(false)
  const [selection, setSelection] = useState<ViewerSelection | null>(null)
  const [notice, setNotice] = useState('')
  const suggest = useSuggestTable()

  const run = (s: ViewerSelection) => suggest.mutate({ documentId, page: s.page, bbox: s.bbox })
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
    toggle: () => {
      if (pointing) return finish('')
      setNotice('')
      setPointing(true)
    },
    cancel: () => finish(''),
    select: (s: ViewerSelection) => {
      setPointing(false)
      setSelection(s)
      run(s)
    },
    retry: () => {
      if (selection) run(selection)
    },
    add: (name: string) => {
      const data = suggest.data
      if (!data) return
      const field: FieldDef = {
        id: crypto.randomUUID(),
        key: slugifyKey(name) || 'table',
        label: name.trim(),
        type: 'table',
        required: false,
        columns: data.columns,
        examples: [data.example],
      }
      dispatch({ type: 'addFields', fields: [field] })
      finish(`Added table ${field.label}`)
    },
  }
}
