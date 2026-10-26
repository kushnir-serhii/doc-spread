import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

interface ReviewErrorProps {
  title: string
  message?: string
  /** omit when retrying cannot help */
  onRetry?: () => void
}

/** Error with retry and a way out. The mock cannot tell "not found" from a failure, so one state covers both. */
export const ReviewError = ({ title, message, onRetry }: ReviewErrorProps) => (
  <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-destructive/40 p-6">
    <p className="font-medium">{title}</p>
    <p className="text-sm text-muted-foreground">
      {message ?? 'It may have been deleted, or something went wrong. Try again, or go back to the Inbox.'}
    </p>
    <div className="flex flex-wrap items-center gap-3">
      {onRetry && (
        <Button className="min-h-touch" onClick={onRetry}>
          Retry
        </Button>
      )}
      <Link
        to="/inbox"
        className="inline-flex min-h-touch items-center rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to Inbox
      </Link>
    </div>
  </div>
)
