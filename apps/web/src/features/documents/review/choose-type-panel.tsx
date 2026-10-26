import { useId } from 'react'
import { AssignTypeCell } from '@/features/documents/assign-type-cell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentTypes, useReassignDocumentType } from '@/lib/api'
import type { Document } from '@/lib/mock/types'

interface ChooseTypePanelProps {
  doc: Document
}

/** Unclassified document: pick a type (extraction starts) or create one from this document. */
export const ChooseTypePanel = ({ doc }: ChooseTypePanelProps) => {
  const titleId = useId()
  const types = useDocumentTypes()
  const reassign = useReassignDocumentType()
  return (
    <section aria-labelledby={titleId} className="flex max-w-xl flex-col gap-4 rounded-lg border bg-card p-6">
      <div>
        <h2 id={titleId} className="text-lg font-semibold">
          Choose a type
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We could not tell what kind of document this is. Pick its type to extract the fields.
        </p>
      </div>
      {types.isPending ? (
        <Skeleton className="h-11 w-full max-w-sm" role="status" aria-label="Loading types" />
      ) : types.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>The types could not be loaded.</p>
          <Button variant="outline" className="min-h-touch" onClick={() => void types.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <AssignTypeCell
          doc={doc}
          types={types.data}
          isPending={reassign.isPending}
          onAssign={(id, typeId) => reassign.mutate({ id, typeId })}
        />
      )}
      {reassign.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not assign the type: {reassign.error.message}
        </p>
      )}
    </section>
  )
}
