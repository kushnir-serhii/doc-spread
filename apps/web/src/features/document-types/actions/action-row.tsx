import { CircleAlert, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldAction, FieldDef } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { actionLine, actionTitle } from './action-title'

interface ActionRowProps {
  action: FieldAction
  fields: readonly FieldDef[]
  /** the action refers to something that is gone or no longer fits */
  invalid: boolean
  onEdit: () => void
  onRemove: () => void
}

/** One action: label, readable expression, severity; edit and delete. */
export const ActionRow = ({ action, fields, invalid, onEdit, onRemove }: ActionRowProps) => {
  const title = actionTitle(action, fields)
  const line = actionLine(action, fields)
  return (
    <div className="flex items-center">
      <button
        type="button"
        data-action-select={action.id}
        onClick={onEdit}
        className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-md px-4 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-12"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" title={title}>
            {title}
          </span>
          <span className="block truncate text-xs text-muted-foreground" title={line}>
            {line}
          </span>
        </span>
        {invalid && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden />
            Needs fixing
          </span>
        )}
        {action.kind === 'check' && (
          <span
            className={cn(
              'shrink-0 rounded px-1.5 py-0.5 text-xs',
              action.severity === 'blocking'
                ? 'border border-destructive text-destructive'
                : 'bg-warning-soft text-warning-soft-foreground',
            )}
          >
            {action.severity === 'blocking' ? 'Blocking' : 'Warning'}
          </span>
        )}
      </button>
      <Button variant="ghost" size="icon" className="size-touch md:size-9" aria-label={`Edit ${title}`} onClick={onEdit}>
        <Pencil aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-touch md:size-9"
        aria-label={`Delete ${title}`}
        onClick={onRemove}
      >
        <Trash2 aria-hidden />
      </Button>
    </div>
  )
}
