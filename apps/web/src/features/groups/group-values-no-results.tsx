import { Button } from '@/components/ui/button'

interface GroupValuesNoResultsProps {
  onClear: () => void
}

export const GroupValuesNoResults = ({ onClear }: GroupValuesNoResultsProps) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-6 text-center sm:p-10">
    <div>
      <h2 className="text-lg font-semibold">No values match</h2>
      <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
    </div>
    <Button variant="outline" className="min-h-touch md:min-h-9" onClick={onClear}>
      Clear search
    </Button>
  </div>
)
