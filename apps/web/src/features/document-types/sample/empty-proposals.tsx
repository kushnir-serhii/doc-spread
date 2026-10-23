import { ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Shown when the AI found nothing to propose. */
export const EmptyProposals = () => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-6 text-center">
    <ScanSearch className="size-8 text-muted-foreground" aria-hidden />
    <div>
      <p className="font-medium">No fields found in this sample</p>
      <p className="text-sm text-muted-foreground">
        The document may be too short or unclear. Point at a value on the document to add a field, or add one in the editor.
      </p>
    </div>
    {/* Pointing arrives with slice 2 of spec 015. */}
    <Button variant="outline" disabled title="Coming soon" className="min-h-touch md:min-h-9">
      Point to add
    </Button>
  </div>
)
