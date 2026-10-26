import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Document } from '@/lib/mock/types'

interface SampleDocumentListProps {
  /** undefined while loading */
  documents: Document[] | undefined
  failed: boolean
  /** Ids already in the sample set; they can't be added twice. */
  takenIds: string[]
  emptyText: string
  onRetry: () => void
  onPick: (documentId: string) => void
}

/** Documents to pick a sample from: loading, error with retry, empty, or one button per document. */
export const SampleDocumentList = ({ documents, failed, takenIds, emptyText, onRetry, onPick }: SampleDocumentListProps) => {
  if (failed) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        Couldn’t load the documents.
        <Button size="sm" variant="outline" className="min-h-touch md:min-h-9" onClick={onRetry}>
          Retry
        </Button>
      </p>
    )
  }
  if (!documents) {
    return (
      <div role="status" aria-label="Loading documents" className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
  if (documents.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
      {documents.map((doc) => {
        const taken = takenIds.includes(doc.id)
        return (
          <li key={doc.id}>
            <button
              type="button"
              disabled={taken}
              onClick={() => onPick(doc.id)}
              className="flex min-h-touch w-full min-w-0 items-center gap-2 px-3 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:min-h-10"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate" title={doc.file.name}>
                {doc.file.name}
              </span>
              {taken && <span className="shrink-0 text-xs text-muted-foreground">Already a sample</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
