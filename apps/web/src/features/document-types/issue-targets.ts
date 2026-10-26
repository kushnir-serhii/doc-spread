import type { EditorTarget, Selection } from './editor-target'
import type { ValidationIssue } from './validate-draft'

/** Ids of the fields and columns with problems; a table also counts when one of its columns does. */
export const getInvalidIds = (issues: readonly ValidationIssue[]) =>
  new Set(
    issues.flatMap(({ target }) =>
      typeof target === 'string' || 'actionId' in target
        ? []
        : [target.fieldId, ...(target.columnId ? [target.columnId] : [])],
    ),
  )

/** The id of the action an issue is about, if any. */
export const getIssueActionId = ({ target }: ValidationIssue): string | null =>
  typeof target !== 'string' && 'actionId' in target ? target.actionId : null

/** The problems of exactly the selected field or column. */
export const getTargetIssues = (issues: readonly ValidationIssue[], target: EditorTarget | null) => {
  if (target === null) return []
  const fieldId = target.kind === 'field' ? target.field.id : target.table.id
  const columnId = target.kind === 'column' ? target.column.id : undefined
  return issues.filter(
    ({ target: t }) => typeof t !== 'string' && 'fieldId' in t && t.fieldId === fieldId && t.columnId === columnId,
  )
}

/** What to select to show an issue; null for issues outside the editor. */
export const getIssueSelection = (issue: ValidationIssue): Selection => {
  const { target } = issue
  if (typeof target === 'string' || 'actionId' in target) return null
  return target.columnId
    ? { kind: 'column', fieldId: target.fieldId, columnId: target.columnId }
    : { kind: 'field', fieldId: target.fieldId }
}

/** Moves focus to the input of an issue; call it after the editor rendered. */
export const focusIssue = ({ part }: ValidationIssue, nameInput: HTMLElement | null) => {
  if (part === 'name') {
    nameInput?.focus()
    return
  }
  // An action's dialog takes focus itself.
  if (part === 'action') return
  if (part === 'fields') {
    document.querySelector<HTMLElement>('[data-add-field]')?.focus()
    return
  }
  const editor = document.querySelector<HTMLElement>('[data-field-editor]')
  const input =
    editor?.querySelector<HTMLElement>(`[data-part="${part}"][aria-invalid="true"]`) ??
    editor?.querySelector<HTMLElement>(`[data-part="${part}"]`)
  // Rules without an input (title, grouping) land on the editor itself.
  const target = input ?? editor
  target?.focus()
}
