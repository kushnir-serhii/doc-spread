import { Button } from '@/components/ui/button'

interface DocumentTableErrorProps {
  onRetry: () => void
}

export const DocumentTableError = ({ onRetry }: DocumentTableErrorProps) => (
  <div
    role="alert"
    className="flex flex-col items-center gap-3 rounded-lg border bg-danger-soft p-8 text-center text-sm"
  >
    <p className="text-danger-soft-foreground">Documents could not be loaded.</p>
    <Button variant="outline" className="min-h-touch" onClick={onRetry}>
      Retry
    </Button>
  </div>
)
