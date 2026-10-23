import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

interface BulkBarProps {
  count: number
  approvableCount: number
  /** undefined when no single type is chosen */
  exportHref: string | undefined
  isApproving: boolean
  error: string | undefined
  onApprove: () => void
  onClear: () => void
}

/** Sticky at the bottom on small screens, a plain bar above the table from md up. */
export const BulkBar = ({ count, approvableCount, exportHref, isApproving, error, onApprove, onClear }: BulkBarProps) => {
  const skipped = count - approvableCount
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky bottom-0 z-20 -mx-4 space-y-2 border-t bg-background px-4 py-3 max-md:order-last md:static md:mx-0 md:mb-3 md:rounded-lg md:border"
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn't approve: {error} Try again.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="mr-auto text-sm font-medium">{count} selected</p>
        <Button className="min-h-touch" disabled={approvableCount === 0 || isApproving} onClick={onApprove}>
          {isApproving ? 'Approving…' : `Approve ${approvableCount}`}
        </Button>
        {exportHref ? (
          <Button asChild variant="outline" className="min-h-touch">
            <Link to={exportHref}>Export {count}</Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Choose one type to export</p>
        )}
        <Button variant="ghost" className="min-h-touch" onClick={onClear}>
          Clear selection
        </Button>
      </div>
      {skipped > 0 && <p className="text-sm text-muted-foreground">{skipped} will be skipped (not waiting for review)</p>}
    </div>
  )
}
