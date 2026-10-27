import type { FieldDef } from '@/lib/mock/types'
import { cellsForSlot, type Allowed } from './expr-typing'
import type { RowScope } from './row-scope'
import { SlotSelect } from './slot-select'

interface CellSelectProps {
  label: string
  fields: readonly FieldDef[]
  allowed: Allowed
  row: RowScope
  /** '' = none chosen */
  value: string
  onChange: (columnId: string) => void
}

/** "This row › <column>": the columns of the action's table whose type fits. A chosen one that no longer fits stays listed. */
export const CellSelect = ({ label, fields, allowed, row, value, onChange }: CellSelectProps) => {
  const options = cellsForSlot(fields, allowed, row)
  const table = fields.find((f) => f.id === row.tableFieldId)
  const current = table?.columns?.find((c) => c.id === value)
  const stale = current && !options.some((c) => c.id === current.id)
  const unknown = value !== '' && !current
  return (
    <SlotSelect
      aria-label={`${label}: column of this row`}
      value={value}
      aria-invalid={unknown || stale ? true : undefined}
      onChange={(event) => onChange(event.target.value)}
      className="flex-1"
    >
      <option value="">Choose a column…</option>
      {unknown && <option value={value}>(deleted column)</option>}
      {stale && <option value={current.id}>This row › {current.label || 'Untitled column'} (type doesn’t fit)</option>}
      {options.map((column) => (
        <option key={column.id} value={column.id}>
          This row › {column.label || 'Untitled column'}
        </option>
      ))}
    </SlotSelect>
  )
}
