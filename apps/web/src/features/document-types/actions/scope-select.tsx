import { useId } from 'react'
import { Label } from '@/components/ui/label'
import type { FieldDef } from '@/lib/mock/types'
import { DOCUMENT_SCOPE, type ActionScope } from './action-scope'
import { SlotSelect } from './slot-select'

interface ScopeSelectProps {
  scope: ActionScope
  fields: readonly FieldDef[]
  onChange: (scope: ActionScope) => void
}

const ROW_PREFIX = 'row:'

/** "Applies to": the whole document, or every row of one of the type's tables. Rendered only when there is a table. */
export const ScopeSelect = ({ scope, fields, onChange }: ScopeSelectProps) => {
  const id = useId()
  const tables = fields.filter((f) => f.type === 'table')
  const value = scope.kind === 'row' ? `${ROW_PREFIX}${scope.tableFieldId}` : 'document'
  const gone = scope.kind === 'row' && !tables.some((t) => t.id === scope.tableFieldId)
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Applies to</Label>
      <SlotSelect
        id={id}
        value={value}
        aria-describedby={`${id}-help`}
        aria-invalid={gone ? true : undefined}
        onChange={(event) =>
          onChange(
            event.target.value.startsWith(ROW_PREFIX)
              ? { kind: 'row', tableFieldId: event.target.value.slice(ROW_PREFIX.length) }
              : DOCUMENT_SCOPE,
          )
        }
        className="max-w-md"
      >
        <option value="document">Whole document</option>
        {gone && <option value={value}>Each row of (deleted table)</option>}
        {tables.map((table) => (
          <option key={table.id} value={`${ROW_PREFIX}${table.id}`}>
            Each row of {table.label || 'Untitled table'}
          </option>
        ))}
      </SlotSelect>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {scope.kind === 'row'
          ? 'Runs on every row; use “This row” to read the row’s own cells.'
          : 'Runs once on the document’s fields.'}
      </p>
    </div>
  )
}
