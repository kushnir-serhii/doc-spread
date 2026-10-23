import type { KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { FieldSummary } from './field-summary'

interface FieldRowProps {
  /** A field or a table column. */
  field: Pick<FieldDef, 'id' | 'key' | 'label' | 'type' | 'required'>
  selected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onMove: (direction: 'up' | 'down') => void
}

/** A selectable field or column with move buttons and Alt+↑/↓. */
export const FieldRow = ({ field, selected, isFirst, isLast, onSelect, onMove }: FieldRowProps) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    event.preventDefault()
    onMove(event.key === 'ArrowUp' ? 'up' : 'down')
  }

  return (
    <div onKeyDown={handleKeyDown} className={cn('flex items-center', selected && 'bg-accent')}>
      <button
        type="button"
        data-field-select={field.id}
        aria-current={selected || undefined}
        onClick={onSelect}
        className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-md px-4 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-12"
      >
        <FieldSummary field={field} />
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-touch md:size-9"
        aria-label={`Move ${field.label} up`}
        disabled={isFirst}
        onClick={() => onMove('up')}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-touch md:size-9"
        aria-label={`Move ${field.label} down`}
        disabled={isLast}
        onClick={() => onMove('down')}
      >
        <ArrowDown aria-hidden />
      </Button>
    </div>
  )
}
