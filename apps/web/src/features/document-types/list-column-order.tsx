import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/lib/mock/types'

interface ListColumnOrderProps {
  columns: FieldDef[]
  titleFieldId: string | null
  onMove: (id: string, direction: 'up' | 'down') => void
}

/** The chosen columns in Inbox order; "up" is left. */
export const ListColumnOrder = ({ columns, titleFieldId, onMove }: ListColumnOrderProps) => (
  <ol className="divide-y rounded-md border" aria-label="Column order">
    {columns.map((field, index) => (
      <li key={field.id} className="flex items-center gap-2 pl-3">
        <span className="w-5 shrink-0 text-xs text-muted-foreground" aria-hidden>
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 py-2 text-sm">
          <span className="block truncate" title={field.label}>
            {field.label || 'Untitled field'}
          </span>
          {field.id === titleFieldId && (
            <span className="block text-xs text-muted-foreground">Already shown as the title</span>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-touch md:size-9"
          aria-label={`Move ${field.label} left`}
          disabled={index === 0}
          onClick={() => onMove(field.id, 'up')}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-touch md:size-9"
          aria-label={`Move ${field.label} right`}
          disabled={index === columns.length - 1}
          onClick={() => onMove(field.id, 'down')}
        >
          <ArrowRight aria-hidden />
        </Button>
      </li>
    ))}
  </ol>
)
