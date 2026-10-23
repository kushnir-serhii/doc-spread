import { Button } from '@/components/ui/button'

interface DocumentTableNoResultsProps {
  onClear: () => void
}

export const DocumentTableNoResults = ({ onClear }: DocumentTableNoResultsProps) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
    <div>
      <h2 className="text-lg font-semibold">No documents match</h2>
      <p className="mt-1 text-sm text-muted-foreground">Try a different search or status.</p>
    </div>
    <Button variant="outline" className="min-h-touch" onClick={onClear}>
      Clear filters
    </Button>
  </div>
)
