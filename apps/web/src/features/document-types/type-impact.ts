import { plural } from './field-key'
import type { TypeDraft } from './type-draft'

export interface TypeImpact {
  /** Top-level fields only. */
  added: number
  removed: number
}

/** What saving `draft` over the `saved` type changes, by stable field id. */
export const computeImpact = (saved: TypeDraft, draft: TypeDraft): TypeImpact => {
  const savedIds = new Set(saved.fields.map((field) => field.id))
  const draftIds = new Set(draft.fields.map((field) => field.id))
  return {
    added: draft.fields.filter((field) => !savedIds.has(field.id)).length,
    removed: saved.fields.filter((field) => !draftIds.has(field.id)).length,
  }
}

/** `documentCount` null = not known (yet). */
export const describeAdded = (added: number, documentCount: number | null) =>
  `${plural(added, 'field')} added: ${added === 1 ? 'it' : 'they'} will be empty in ${
    documentCount === null ? 'existing documents' : plural(documentCount, 'document')
  }.`

export const describeRemoved = (removed: number) =>
  `${plural(removed, 'field')} removed: ${removed === 1 ? 'it is' : 'they are'} hidden, the data is kept.`

export const describeReextract = (added: number) =>
  `re-extraction of ${plural(added, 'field')} queued (mock: not run)`
