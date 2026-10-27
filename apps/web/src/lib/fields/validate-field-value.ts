import type { DocumentType, FieldDef, FieldValue } from '@/lib/mock/types'
import { getComputedColumnIds, getComputedFieldIds } from './computed-fields'
import { isEmail, isIsoDate, isPhone, isTaxId } from './field-formats'

type Checked = Pick<FieldDef, 'required' | 'options' | 'type'>

export interface ValidationIssue {
  fieldId: string
  label: string
  reason: string
  /** set when the problem is in a table cell */
  cell?: { rowId: string; columnId: string }
}

type Scalar = Exclude<FieldValue, { type: 'table' }>

const isEmpty = (value: Scalar) => value.value === null || (typeof value.value === 'string' && value.value.trim() === '')

const formatReason = (field: Checked, value: Scalar): string | null => {
  switch (value.type) {
    case 'text':
    case 'boolean':
      return null
    case 'number':
      return value.value !== null && !Number.isFinite(value.value) ? 'Enter a number.' : null
    case 'money':
      return value.value !== null && !Number.isInteger(value.value.amount) ? 'Enter a valid amount.' : null
    case 'email':
      return value.value !== null && !isEmail(value.value.trim()) ? 'Enter a valid email address.' : null
    case 'phone':
      return value.value !== null && !isPhone(value.value.trim()) ? 'Enter a valid phone number.' : null
    case 'tax_id':
      return value.value !== null && !isTaxId(value.value.trim()) ? 'A tax ID has at least 8 letters or digits.' : null
    case 'date':
      return value.value !== null && !isIsoDate(value.value) ? 'Enter a valid date.' : null
    case 'select':
      return value.value !== null && !(field.options ?? []).includes(value.value) ? 'Choose one of the options.' : null
    default: {
      const unreachable: never = value
      return unreachable
    }
  }
}

/** `null` when the value is fine, else why not. Required means non-empty; formats are checked when there is a value. */
export const validateFieldValue = (field: Checked, value: FieldValue): string | null => {
  if (value.type === 'table') {
    return field.required && value.rows.length === 0 ? 'Add at least one row.' : null
  }
  // `boolean` and `number` are never "blank": only null counts as empty
  if (isEmpty(value)) return field.required ? 'Required.' : null
  // the field's declared type decides the format, so a mismatched value is reported rather than trusted
  return value.type === field.type ? formatReason(field, value) : `Expected ${field.type}.`
}

/** Every problem that blocks approval, in the type's field order. Computed fields and computed cells are skipped: nobody enters them. */
export const validateDocument = (type: DocumentType, values: Record<string, FieldValue>): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const computedIds = getComputedFieldIds(type)
  for (const field of type.fields) {
    if (computedIds.has(field.id)) continue
    const value = values[field.id]
    if (value === undefined) {
      if (field.required) issues.push({ fieldId: field.id, label: field.label, reason: 'Required.' })
      continue
    }
    if (value.type !== 'table') {
      const reason = validateFieldValue(field, value)
      if (reason) issues.push({ fieldId: field.id, label: field.label, reason })
      continue
    }
    const tableReason = validateFieldValue(field, value)
    if (tableReason) issues.push({ fieldId: field.id, label: field.label, reason: tableReason })
    const computedColumnIds = getComputedColumnIds(type, field.id)
    value.rows.forEach((row, index) => {
      for (const column of field.columns ?? []) {
        // nobody enters a computed cell
        if (computedColumnIds.has(column.id)) continue
        const cell = row.cells[column.id]
        const reason = cell ? validateFieldValue(column, cell) : column.required ? 'Required.' : null
        if (reason) {
          const where = `row ${index + 1}, ${column.label}: ${reason}`
          issues.push({ fieldId: field.id, label: field.label, reason: where, cell: { rowId: row.id, columnId: column.id } })
        }
      }
    })
  }
  return issues
}
