import type { ColumnDef, FieldDef } from '@/lib/mock/types'
import { getKeyError } from './field-key'
import { canBeTitle, canGroupBy, MAX_LIST_COLUMNS } from './list-settings'
import type { TypeDraft } from './type-draft'

/** Which input of the editor an issue belongs to; used to focus it. */
export type IssuePart = 'name' | 'fields' | 'label' | 'key' | 'options' | 'columns' | 'consistency'

export type IssueTarget = 'name' | 'fields' | { fieldId: string; columnId?: string }

export interface ValidationIssue {
  /** Stable within one validation run; a list key. */
  id: string
  target: IssueTarget
  part: IssuePart
  /** What the issue is about: "Type name", a field label or "Table › Column". */
  subject: string
  message: string
}

const named = (label: string, fallback: string) => (label.trim() === '' ? fallback : label)

const optionMessages = (options: readonly string[] | undefined): string[] => {
  const values = (options ?? []).map((option) => option.trim().toLowerCase())
  const filled = values.filter((value) => value !== '')
  return [
    ...(values.length === 0 ? ['Add at least one option.'] : []),
    ...(filled.length !== values.length ? ['Options must not be empty.'] : []),
    ...(new Set(filled).size !== filled.length ? ['Options must be unique.'] : []),
  ]
}

interface ItemTarget {
  fieldId: string
  columnId?: string
}

/** Checks a field or a table column; `siblings` are the fields of the type or the columns of the table. */
const itemIssues = (
  item: FieldDef | ColumnDef,
  siblings: readonly (FieldDef | ColumnDef)[],
  target: ItemTarget,
  subject: string,
): ValidationIssue[] => {
  const issue = (part: IssuePart, message: string): ValidationIssue => ({
    id: `${target.fieldId}:${target.columnId ?? ''}:${part}:${message}`,
    target,
    part,
    subject,
    message,
  })
  const keyError = getKeyError(item, siblings, target.columnId ? 'column' : 'field')
  return [
    ...(item.label.trim() === '' ? [issue('label', 'Label is required.')] : []),
    ...(keyError ? [issue('key', keyError)] : []),
    ...(item.type === 'select' ? optionMessages(item.options).map((message) => issue('options', message)) : []),
  ]
}

const tableIssues = (field: FieldDef, subject: string): ValidationIssue[] => {
  const columns = field.columns ?? []
  const own: ValidationIssue[] =
    columns.length === 0
      ? [
          {
            id: `${field.id}::columns`,
            target: { fieldId: field.id },
            part: 'columns',
            subject,
            message: 'Add at least one column.',
          },
        ]
      : []
  const nested = columns.flatMap((column) =>
    itemIssues(
      column,
      columns,
      { fieldId: field.id, columnId: column.id },
      `${subject} › ${named(column.label, 'Untitled column')}`,
    ),
  )
  return [...own, ...nested]
}

const consistencyIssues = (draft: TypeDraft): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const add = (field: FieldDef, message: string) =>
    issues.push({
      id: `${field.id}::consistency:${message}`,
      target: { fieldId: field.id },
      part: 'consistency',
      subject: named(field.label, 'Untitled field'),
      message,
    })
  const title = draft.fields.find((field) => field.id === draft.titleFieldId)
  if (title && !canBeTitle(title.type)) add(title, 'This field can’t be the document title.')
  if (draft.listColumnIds.length > MAX_LIST_COLUMNS) {
    issues.push({
      id: 'list-columns',
      target: 'fields',
      part: 'consistency',
      subject: 'List columns',
      message: `A list shows at most ${MAX_LIST_COLUMNS} columns.`,
    })
  }
  for (const field of draft.fields) {
    if (field.groupable && !canGroupBy(field.type)) add(field, 'Only text, tax ID and select fields can be grouped.')
  }
  return issues
}

/** All reasons the draft can't be saved yet, in the order of the form. Empty = valid. */
export const validateDraft = (draft: TypeDraft): ValidationIssue[] => [
  ...(draft.name.trim() === ''
    ? [{ id: 'name', target: 'name', part: 'name', subject: 'Type name', message: 'Give the type a name.' } satisfies ValidationIssue]
    : []),
  ...(draft.fields.length === 0
    ? [{ id: 'fields', target: 'fields', part: 'fields', subject: 'Fields', message: 'Add at least one field.' } satisfies ValidationIssue]
    : []),
  ...draft.fields.flatMap((field) => {
    const subject = named(field.label, 'Untitled field')
    return [
      ...itemIssues(field, draft.fields, { fieldId: field.id }, subject),
      ...(field.type === 'table' ? tableIssues(field, subject) : []),
    ]
  }),
  ...consistencyIssues(draft),
]

/** The issues of one item as the editor shows them: the label's own message, and the rest as a list. */
export const splitEditorIssues = (issues: readonly ValidationIssue[]) => ({
  labelError: issues.find((issue) => issue.part === 'label')?.message ?? null,
  // Key errors are already shown at the key input.
  errors: issues.filter((issue) => issue.part !== 'label' && issue.part !== 'key').map((issue) => issue.message),
})
