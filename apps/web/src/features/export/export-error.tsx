import { Button } from '@/components/ui/button'

interface ExportErrorProps {
  onRetry: () => void
}

export const ExportError = ({ onRetry }: ExportErrorProps) => (
  <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border bg-danger-soft p-8 text-center text-sm">
    <p className="text-danger-soft-foreground">Export data could not be loaded.</p>
    <Button variant="outline" className="min-h-touch md:min-h-9" onClick={onRetry}>
      Retry
    </Button>
  </div>
)
