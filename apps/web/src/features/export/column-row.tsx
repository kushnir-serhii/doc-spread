import { useId } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColumnRowProps {
  label: string
  /** the field type, shown quietly next to the label */
  kind: string
  include: boolean
  header: string
  error?: string
  /** include is forced on; the reason is shown under the label */
  lockedReason?: string
  canMoveUp: boolean
  canMoveDown: boolean
  onIncludeChange: (include: boolean) => void
  onHeaderChange: (header: string) => void
  onMove: (delta: -1 | 1) => void
  /** extra controls under the row (a table's mode) */
  children?: ReactNode
}

/** One mapping row; stacks at 375px. */
export const ColumnRow = ({
  label,
  kind,
  include,
  header,
  error,
  lockedReason,
  canMoveUp,
  canMoveDown,
  onIncludeChange,
  onHeaderChange,
  onMove,
  children,
}: ColumnRowProps) => {
  const id = useId()
  const locked = lockedReason !== undefined
  return (
    <li className="flex flex-col gap-2 px-3 py-2 sm:px-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-4">
        <div className="min-w-0 md:w-64 md:shrink-0">
          <label htmlFor={`${id}-include`} className="flex min-h-touch cursor-pointer items-center gap-3 text-sm md:min-h-9">
            <input
              id={`${id}-include`}
              type="checkbox"
              checked={include || locked}
              disabled={locked}
              aria-describedby={locked ? `${id}-locked` : undefined}
              onChange={(event) => onIncludeChange(event.target.checked)}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 truncate font-medium" title={label}>
              {label}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{kind}</span>
          </label>
          {locked && (
            <p id={`${id}-locked`} className="pl-7 text-xs text-muted-foreground">
              {lockedReason}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-start gap-1">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor={`${id}-header`} className="sr-only">
              Header name for {label}
            </Label>
            <Input
              id={`${id}-header`}
              value={header}
              disabled={!include && !locked}
              aria-invalid={error !== undefined}
              aria-describedby={`${id}-error`}
              onChange={(event) => onHeaderChange(event.target.value)}
              className="min-h-touch md:min-h-9"
            />
            <p id={`${id}-error`} role="alert" className="text-sm text-danger empty:hidden">
              {error}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-touch shrink-0 md:size-9"
            aria-label={`Move ${label} up`}
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-touch shrink-0 md:size-9"
            aria-label={`Move ${label} down`}
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden />
          </Button>
        </div>
      </div>
      {children}
    </li>
  )
}
