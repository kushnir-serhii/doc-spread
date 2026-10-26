import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ViewerSelection } from '@/features/documents/viewer/viewer-types'
import type { FieldSuggestion } from '@/lib/mock/types'
import { SuggestionForm } from './suggestion-form'
import type { SuggestionEdits } from './use-point-to-add'
import type { ProposalItem } from './use-proposal-review'

interface SuggestionPanelProps {
  selection: ViewerSelection
  suggestion: FieldSuggestion | undefined
  loading: boolean
  failed: boolean
  /** The listed field whose box the selection overlaps. */
  overlap: ProposalItem | undefined
  onRetry: () => void
  onAdd: (edits: SuggestionEdits) => void
  onFix: (item: ProposalItem) => void
  onCancel: () => void
}

/** Shown beside the list after a selection is confirmed. Focus moves in; Esc cancels. */
export const SuggestionPanel = ({
  selection,
  suggestion,
  loading,
  failed,
  overlap,
  onRetry,
  onAdd,
  onFix,
  onCancel,
}: SuggestionPanelProps) => {
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
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-sm font-medium outline-none">
        New field from “{selection.text || 'selection'}”
      </h2>
      {overlap && (
        <div className="flex flex-col gap-2 rounded-md border bg-muted p-3 text-sm">
          <p>This overlaps the box of “{overlap.field.label}”.</p>
          <Button variant="outline" onClick={() => onFix(overlap)} className="min-h-touch self-start md:min-h-9">
            Fix “{overlap.field.label}” instead
          </Button>
        </div>
      )}
      {loading && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Guessing label and type…</p>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          Couldn’t guess a label for this selection.
          <Button size="sm" variant="outline" onClick={onRetry} className="min-h-touch md:min-h-9">
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="min-h-touch md:min-h-9">
            Cancel
          </Button>
        </div>
      )}
      {suggestion && <SuggestionForm suggestion={suggestion} onAdd={onAdd} onCancel={onCancel} />}
    </section>
  )
}
