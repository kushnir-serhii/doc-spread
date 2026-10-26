/** One source for the keyboard shortcuts of Review: the handler and the help dialog both read it. */
export interface ReviewShortcut {
  id: 'next-field' | 'previous-field' | 'confirm' | 'point' | 'approve' | 'save' | 'next-document' | 'edit' | 'leave' | 'help'
  /** keys as shown, pressed together when there are several */
  keys: readonly string[]
  description: string
  /** still available when the document can no longer be edited */
  readOnly: boolean
}

export const REVIEW_SHORTCUTS: readonly ReviewShortcut[] = [
  { id: 'next-field', keys: ['J'], description: 'Next field', readOnly: true },
  { id: 'previous-field', keys: ['K'], description: 'Previous field', readOnly: true },
  { id: 'edit', keys: ['Enter'], description: 'Edit the focused field', readOnly: false },
  { id: 'leave', keys: ['Esc'], description: 'Leave the input, back to the field', readOnly: false },
  { id: 'confirm', keys: ['C'], description: 'Confirm the focused field', readOnly: false },
  { id: 'point', keys: ['P'], description: 'Point on the document for the focused field', readOnly: false },
  { id: 'approve', keys: ['Ctrl', 'Enter'], description: 'Approve', readOnly: false },
  { id: 'save', keys: ['Ctrl', 'S'], description: 'Save draft', readOnly: false },
  { id: 'next-document', keys: ['N'], description: 'Next document', readOnly: true },
  { id: 'help', keys: ['?'], description: 'Show this list', readOnly: true },
]

/** For `aria-keyshortcuts` and tooltips. */
export const shortcutLabel = (id: ReviewShortcut['id']): string =>
  REVIEW_SHORTCUTS.find((shortcut) => shortcut.id === id)?.keys.join('+') ?? ''
