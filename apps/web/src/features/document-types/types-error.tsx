import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TypesErrorProps {
  onRetry: () => void
}

export const TypesError = ({ onRetry }: TypesErrorProps) => (
  <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
    <TriangleAlert className="size-6 text-destructive" aria-hidden />
    <div>
      <p className="font-medium">Couldn't load document types</p>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
    </div>
    <Button variant="outline" onClick={onRetry} className="min-h-touch md:min-h-9">
      Try again
    </Button>
  </div>
)
