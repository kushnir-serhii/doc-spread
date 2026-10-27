import type { FieldDef } from '@/lib/mock/types'
import { columnsForSlot, type Allowed } from './expr-typing'
import type { RowScope } from './row-scope'
import { SlotSelect } from './slot-select'

interface ColumnSelectProps {
  label: string
  fields: readonly FieldDef[]
  allowed: Allowed
  /** set in a row action: computed columns may not be offered as lists */
  row?: RowScope
  fieldId: string
  columnId: string
  onChange: (fieldId: string, columnId: string) => void
}

const encode = (fieldId: string, columnId: string) => (fieldId === '' ? '' : `${fieldId}|${columnId}`)

/** Columns of table fields, grouped by table; only those whose type fits as a list. */
export const ColumnSelect = ({ label, fields, allowed, row, fieldId, columnId, onChange }: ColumnSelectProps) => {
  const options = columnsForSlot(fields, allowed, row)
  const value = encode(fieldId, columnId)
  const known = options.some(({ table, column }) => encode(table.id, column.id) === value)
  const tables = [...new Set(options.map(({ table }) => table))]
  return (
    <SlotSelect
      aria-label={`${label}: table column`}
      value={value}
      aria-invalid={value !== '' && !known ? true : undefined}
      onChange={(event) => {
        const [nextField = '', nextColumn = ''] = event.target.value.split('|')
        onChange(nextField, nextColumn)
      }}
      className="flex-1"
    >
      <option value="">Choose a column…</option>
      {value !== '' && !known && <option value={value}>(deleted column or type doesn’t fit)</option>}
      {tables.map((table) => (
        <optgroup key={table.id} label={table.label || 'Untitled table'}>
          {options
            .filter((option) => option.table.id === table.id)
            .map(({ column }) => (
              <option key={column.id} value={encode(table.id, column.id)}>
                {column.label || 'Untitled column'}
              </option>
            ))}
        </optgroup>
      ))}
    </SlotSelect>
  )
}
