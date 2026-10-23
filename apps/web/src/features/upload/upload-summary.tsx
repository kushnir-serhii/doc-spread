import { RotateCw } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { describeCounts } from './file-state'
import type { FileCounts } from './file-state'

interface UploadSummaryProps {
  counts: FileCounts
  sharedType: { typeId: string; typeName: string } | undefined
  onRetryFailed: () => void
}

const linkClass =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-medium shadow-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export const UploadSummary = ({ counts, sharedType, onRetryFailed }: UploadSummaryProps) => {
  const headingId = useId()
  const { classified, unclassified, failed } = counts
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div>
        <h2 id={headingId} className="text-sm font-semibold">
          Upload finished
        </h2>
        <p className="text-sm text-muted-foreground">{describeCounts(counts)}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {unclassified > 0 && (
          <Link to="/inbox?type=unclassified" className={linkClass}>
            Assign types ({unclassified})
          </Link>
        )}
        {sharedType && (
          <Link to={`/inbox?type=${encodeURIComponent(sharedType.typeId)}`} className={linkClass}>
            Review {sharedType.typeName} ({classified})
          </Link>
        )}
        <Link to="/inbox" className={linkClass}>
          Open Inbox
        </Link>
        {failed > 0 && (
          <Button type="button" variant="outline" className="min-h-11" onClick={onRetryFailed}>
            <RotateCw aria-hidden />
            Retry failed ({failed})
          </Button>
        )}
      </div>
    </section>
  )
}
