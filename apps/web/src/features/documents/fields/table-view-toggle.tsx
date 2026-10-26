import { LayoutList, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TableViewMode } from './use-table-view-mode'

interface TableViewToggleProps {
  mode: TableViewMode
  onChange: (next: TableViewMode) => void
}

const OPTIONS = [
  { mode: 'table', label: 'Table', icon: Table },
  { mode: 'list', label: 'List', icon: LayoutList },
] as const

/** "Table | List" segmented control. */
export const TableViewToggle = ({ mode, onChange }: TableViewToggleProps) => (
  <div role="group" aria-label="Table view" className="flex gap-0.5 rounded-md border bg-card p-0.5">
    {OPTIONS.map(({ mode: option, label, icon: Icon }) => (
      <Button
        key={option}
        type="button"
        variant={mode === option ? 'secondary' : 'ghost'}
        aria-pressed={mode === option}
        className="min-h-touch"
        onClick={() => onChange(option)}
      >
        <Icon aria-hidden="true" />
        {label}
      </Button>
    ))}
  </div>
)
