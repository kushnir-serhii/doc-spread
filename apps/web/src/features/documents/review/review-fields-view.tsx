import type { UseQueryResult } from '@tanstack/react-query'
import type { Document, DocumentType } from '@/lib/mock/types'
import { ReviewError } from './review-error'
import { ReviewNotice } from './review-notice'
import { ReviewWorkspace } from './review-workspace'
import { ReviewWorkspaceSkeleton } from './review-workspace-skeleton'

interface ReviewFieldsViewProps {
  doc: Document
  typeQuery: UseQueryResult<DocumentType>
}

/** A document with extracted values: waits for the type version it was extracted with, then shows viewer and form. */
export const ReviewFieldsView = ({ doc, typeQuery }: ReviewFieldsViewProps) => {
  if (doc.typeId === null) {
    return <ReviewError title="This document has no type" message="Go back to the Inbox and choose a type for it." />
  }
  if (typeQuery.isPending) return <ReviewWorkspaceSkeleton />
  if (typeQuery.isError) {
    return <ReviewError title="The document type could not be loaded" onRetry={() => void typeQuery.refetch()} />
  }
  return (
    <div className="flex flex-col gap-4">
      <ReviewNotice doc={doc} />
      <ReviewWorkspace key={doc.id} doc={doc} type={typeQuery.data} />
    </div>
  )
}
