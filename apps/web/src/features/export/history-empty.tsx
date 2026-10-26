import { Button } from '@/components/ui/button'

interface HistoryEmptyProps {
  onNewExport: () => void
}

export const HistoryEmpty = ({ onNewExport }: HistoryEmptyProps) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
    <div>
      <h2 className="text-lg font-semibold">No exports yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Exports you make will be listed here.</p>
    </div>
    <Button className="min-h-touch md:min-h-9" onClick={onNewExport}>
      New export
    </Button>
  </div>
)
