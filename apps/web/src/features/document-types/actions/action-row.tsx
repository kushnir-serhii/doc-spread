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
  /** undefined = the action can't be edited here yet (row actions) */
  onEdit?: () => void
  onRemove: () => void
}

const rowScope = (action: Extract<FieldAction, { tableFieldId: string }>, fields: readonly FieldDef[]) =>
  `Each row of ${fields.find((f) => f.id === action.tableFieldId)?.label || 'a deleted table'}`

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
        disabled={onEdit === undefined}
        className="flex min-h-touch min-w-0 flex-1 items-center gap-3 rounded-md px-4 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default md:min-h-12"
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
        {(action.kind === 'row_check' || action.kind === 'row_compute') && (
          <span className="shrink-0 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
            {rowScope(action, fields)}
          </span>
        )}
        {(action.kind === 'check' || action.kind === 'row_check') && (
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
      {onEdit && (
        <Button variant="ghost" size="icon" className="size-touch md:size-9" aria-label={`Edit ${title}`} onClick={onEdit}>
          <Pencil aria-hidden />
        </Button>
      )}
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
