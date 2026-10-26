import { useState, type Dispatch } from 'react'
import type { FieldDef } from '@/lib/mock/types'
import { slugifyKey } from '../field-key'
import type { TypeDraft } from '../type-draft'
import type { BuilderAction } from '../type-draft-reducer'

export type ProposalStatus = 'proposed' | 'accepted' | 'rejected'

export interface ProposalItem {
  /** The draft's field once accepted; otherwise the proposal with the user's rename. */
  field: FieldDef
  status: ProposalStatus
}

/**
 * Accepted proposals live in the draft (the reducer holds everything until Save);
 * rejected ids and renames of not-yet-accepted proposals are local to the screen.
 */
export const useProposalReview = (proposals: FieldDef[], draft: TypeDraft, dispatch: Dispatch<BuilderAction>) => {
  const [rejected, setRejected] = useState<string[]>([])
  const [renames, setRenames] = useState<Record<string, string>>({})

  const proposed = proposals.map((proposal): ProposalItem => {
    const accepted = draft.fields.find((f) => f.id === proposal.id)
    if (accepted) return { field: accepted, status: 'accepted' }
    const field = { ...proposal, label: renames[proposal.id] ?? proposal.label }
    return { field, status: rejected.includes(proposal.id) ? 'rejected' : 'proposed' }
  })
  // Fields that came from somewhere else (duplicated in the editor, added by hand) stay in the list.
  const others = draft.fields
    .filter((f) => !proposals.some((p) => p.id === f.id))
    .map((field): ProposalItem => ({ field, status: 'accepted' }))
  const items = [...proposed, ...others]

  /** A rename made before accepting also re-derives the key, like renaming in the editor. */
  const withRename = (field: FieldDef): FieldDef =>
    field.id in renames ? { ...field, key: slugifyKey(field.label) } : field
  const open = items.filter((item) => item.status === 'proposed')

  return {
    items,
    openCount: open.length,
    accept: (id: string) => {
      const item = open.find((i) => i.field.id === id)
      if (item) dispatch({ type: 'addFields', fields: [withRename(item.field)] })
    },
    acceptAll: () => dispatch({ type: 'addFields', fields: open.map((item) => withRename(item.field)) }),
    reject: (id: string) => {
      if (draft.fields.some((f) => f.id === id)) dispatch({ type: 'deleteField', id })
      setRejected((ids) => [...ids.filter((x) => x !== id), id])
    },
    restore: (id: string) => setRejected((ids) => ids.filter((x) => x !== id)),
    rename: (id: string, label: string) => {
      if (draft.fields.some((f) => f.id === id)) dispatch({ type: 'setFieldLabel', id, label })
      else setRenames((current) => ({ ...current, [id]: label }))
    },
  }
}
