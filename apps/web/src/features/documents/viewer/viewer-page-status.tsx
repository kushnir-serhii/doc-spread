import { Button } from '@/components/ui/button'

export const PageSkeleton = () => (
  <div className="absolute inset-0 animate-pulse bg-muted" role="status" aria-label="Loading page" />
)

interface PageErrorProps {
  pageNumber: number
  onRetry: () => void
}

export const PageError = ({ pageNumber, onRetry }: PageErrorProps) => (
  <div
    role="alert"
    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger-soft p-4 text-center text-sm"
  >
    <p className="text-danger-soft-foreground">Page {pageNumber} could not be displayed.</p>
    <Button variant="outline" size="sm" className="min-h-touch" onClick={onRetry}>
      Retry
    </Button>
  </div>
)
