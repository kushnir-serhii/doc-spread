import { LoaderCircle } from 'lucide-react'
import type { Document } from '@/lib/mock/types'

interface ProcessingPanelProps {
  doc: Document
}

/** uploaded or processing. The page polls, so it replaces itself once extraction finishes. */
export const ProcessingPanel = ({ doc }: ProcessingPanelProps) => (
  <div role="status" className="flex max-w-xl items-start gap-3 rounded-lg border bg-card p-6">
    <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
    <div>
      <p className="font-medium">{doc.status === 'uploaded' ? 'Waiting to be processed' : 'Reading the document'}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        The fields appear here when extraction is done. You can leave this page; it updates by itself.
      </p>
    </div>
  </div>
)
