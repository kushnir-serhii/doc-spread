import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TypesErrorProps {
  onRetry: () => void
  title?: string
}

export const TypesError = ({ onRetry, title = "Couldn't load document types" }: TypesErrorProps) => (
  <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
    <TriangleAlert className="size-6 text-destructive" aria-hidden />
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
    </div>
    <Button variant="outline" onClick={onRetry} className="min-h-touch md:min-h-9">
      Try again
    </Button>
  </div>
)
