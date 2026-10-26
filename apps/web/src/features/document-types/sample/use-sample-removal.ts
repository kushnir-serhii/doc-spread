import type { Dispatch } from 'react'
import type { TypeDraft } from '../type-draft'
import type { BuilderAction } from '../type-draft-reducer'

/** Drops every example taken from the sample out of the draft's fields. */
export const useSampleRemoval = (draft: TypeDraft, dispatch: Dispatch<BuilderAction>) => (documentId: string) => {
  for (const field of draft.fields) {
    if (field.examples.some((example) => example.documentId === documentId)) {
      dispatch({
        type: 'updateField',
        id: field.id,
        patch: { examples: field.examples.filter((example) => example.documentId !== documentId) },
      })
    }
  }
}
