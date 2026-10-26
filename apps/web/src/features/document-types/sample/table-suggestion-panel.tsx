import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { TableSuggestion } from '@/lib/mock/types'
import { TableSuggestionForm } from './table-suggestion-form'

interface TableSuggestionPanelProps {
  suggestion: TableSuggestion | undefined
  loading: boolean
  /** why the rectangle could not be read, when it failed */
  error: Error | null
  onRetry: () => void
  onAdd: (name: string) => void
  onCancel: () => void
}

/** Shown beside the list after a rectangle is drawn. Focus moves in; Esc cancels. */
export const TableSuggestionPanel = ({ suggestion, loading, error, onRetry, onAdd, onCancel }: TableSuggestionPanelProps) => {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onCancel()
  }

  return (
    <section
      aria-labelledby={headingId}
      onKeyDown={handleKeyDown}
      className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-sm font-medium outline-none">
        New table from the region
      </h2>
      {loading && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Reading the table…</p>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          {error.message || 'Couldn’t read a table from this region.'}
          <Button size="sm" variant="outline" onClick={onRetry} className="min-h-touch md:min-h-9">
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="min-h-touch md:min-h-9">
            Cancel
          </Button>
        </div>
      )}
      {suggestion && <TableSuggestionForm suggestion={suggestion} onAdd={onAdd} onCancel={onCancel} />}
    </section>
  )
}
