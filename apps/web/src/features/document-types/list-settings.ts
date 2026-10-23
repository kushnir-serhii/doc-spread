import type { FieldDef, FieldType } from '@/lib/mock/types'

/** Most columns a list can show. */
export const MAX_LIST_COLUMNS = 6

/** Types that can be grouped on the Groups page (spec 014: text and tax ID only). */
export const canGroupBy = (type: FieldType) => type === 'text' || type === 'tax_id'

const TITLE_TYPES: readonly FieldType[] = ['text', 'tax_id', 'email', 'phone', 'select', 'number', 'date']

/** A document's name must read as a short piece of text: not money, yes/no or a table. */
export const canBeTitle = (type: FieldType) => TITLE_TYPES.includes(type)

/** "Column 2", or null when the field is not a list column. */
export const columnPosition = (listColumnIds: readonly string[], fieldId: string) => {
  const index = listColumnIds.indexOf(fieldId)
  return index === -1 ? null : index + 1
}

/** Markers for a field row. */
export const fieldBadges = (field: FieldDef, titleFieldId: string | null, listColumnIds: readonly string[]) => {
  const position = columnPosition(listColumnIds, field.id)
  return [
    ...(field.id === titleFieldId ? ['Title'] : []),
    ...(position === null ? [] : [`Column ${position}`]),
    ...(field.groupable ? ['Grouped'] : []),
  ]
}
