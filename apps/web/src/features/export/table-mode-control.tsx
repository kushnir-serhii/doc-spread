import { useId } from 'react'
import type { ExportFormat, TableExportMode } from '@/lib/mock/types'

interface TableModeControlProps {
  format: ExportFormat
  mode: TableExportMode
  /** why "one row per table row" is unavailable, if it is */
  flattenDisabledReason?: string
  onChange: (mode: TableExportMode) => void
}

const Choice = ({
  name,
  label,
  checked,
  disabled,
  note,
  onSelect,
}: {
  name: string
  label: string
  checked: boolean
  disabled?: boolean
  note?: string
  onSelect: () => void
}) => {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex min-h-touch cursor-pointer items-center gap-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 md:min-h-9">
        <input
          id={id}
          type="radio"
          name={name}
          checked={checked}
          disabled={disabled}
          aria-describedby={note ? `${id}-note` : undefined}
          onChange={onSelect}
          className="size-4 shrink-0 accent-primary"
        />
        {label}
      </label>
      {note && (
        <p id={`${id}-note`} className="pl-7 text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  )
}

/** How a table field leaves the file: XLSX has one way, CSV two. */
export const TableModeControl = ({ format, mode, flattenDisabledReason, onChange }: TableModeControlProps) => {
  const name = useId()
  if (format === 'xlsx') {
    return <p className="text-sm text-muted-foreground">Separate sheet, linked by the Document ID column.</p>
  }
  return (
    <fieldset className="flex flex-col">
      <legend className="sr-only">How to export this table</legend>
      <Choice
        name={name}
        label="Separate file in a zip, linked by Document ID"
        checked={mode === 'separate'}
        onSelect={() => onChange('separate')}
      />
      <Choice
        name={name}
        label="One row per table row (header values repeated)"
        checked={mode === 'flatten'}
        disabled={flattenDisabledReason !== undefined}
        note={flattenDisabledReason}
        onSelect={() => onChange('flatten')}
      />
    </fieldset>
  )
}
