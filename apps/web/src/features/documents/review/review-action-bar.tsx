import { Check, CircleCheck, LoaderCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import { RejectDialog } from './reject-dialog'
import { ReviewIssues } from './review-issues'

interface ReviewActionBarProps {
  typeName: string
  dirty: boolean
  save: { isPending: boolean; isSuccess: boolean; errorMessage: string | null; onSave: () => void }
  approve: { isPending: boolean; errorMessage: string | null; issues: ValidationIssue[]; onApprove: () => void }
  reject: { isPending: boolean; errorMessage: string | null; onReject: (reason: string) => void; onOpen: () => void }
  onIssueSelect: (issue: ValidationIssue) => void
}

/** Approve, Reject and Save draft, kept in reach at the bottom of a long form (and of a 375px screen). */
export const ReviewActionBar = ({ typeName, dirty, save, approve, reject, onIssueSelect }: ReviewActionBarProps) => {
  const busy = save.isPending || approve.isPending || reject.isPending
  return (
    <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t bg-background py-3">
      {approve.issues.length > 0 && <ReviewIssues issues={approve.issues} onSelect={onIssueSelect} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="min-h-touch flex-1 sm:flex-none"
          disabled={busy}
          aria-keyshortcuts="Control+Enter"
          title="Approve (Ctrl+Enter)"
          onClick={approve.onApprove}
        >
          {approve.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {approve.isPending ? 'Approving…' : 'Approve'}
        </Button>
        <RejectDialog
          typeName={typeName}
          disabled={busy}
          isPending={reject.isPending}
          errorMessage={reject.errorMessage}
          onReject={reject.onReject}
          onOpen={reject.onOpen}
        />
        <Button
          variant="outline"
          className="min-h-touch flex-1 sm:flex-none"
          disabled={!dirty || busy}
          aria-keyshortcuts="Control+S"
          title="Save draft (Ctrl+S)"
          onClick={save.onSave}
        >
          {save.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          {save.isPending ? 'Saving…' : 'Save draft'}
        </Button>
        {!busy && !save.errorMessage && (
          <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {save.isSuccess && !dirty && (
              <>
                <CircleCheck className="size-4" aria-hidden="true" />
                Draft saved
              </>
            )}
            {dirty && 'Unsaved changes'}
          </p>
        )}
      </div>
      {save.errorMessage && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          <p className="min-w-0 break-words">Could not save: {save.errorMessage}</p>
          <Button variant="outline" className="min-h-touch" disabled={busy} onClick={save.onSave}>
            Retry
          </Button>
        </div>
      )}
      {approve.errorMessage && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          <p className="min-w-0 break-words">Could not approve: {approve.errorMessage}</p>
          <Button variant="outline" className="min-h-touch" disabled={busy} onClick={approve.onApprove}>
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
