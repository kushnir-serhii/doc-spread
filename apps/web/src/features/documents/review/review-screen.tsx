import { useDocument, useDocumentType } from '@/lib/api'
import { ReviewBody } from './review-body'
import { ReviewError } from './review-error'
import { ReviewHeader } from './review-header'
import { ReviewSkeleton } from './review-skeleton'

interface ReviewScreenProps {
  documentId: string
}

export const ReviewScreen = ({ documentId }: ReviewScreenProps) => {
  const docQuery = useDocument(documentId)
  const doc = docQuery.data
  // the version the document was extracted with, so a later edit of the type never changes this form
  const typeQuery = useDocumentType(doc?.typeId ?? null, doc?.typeVersion ?? undefined)

  if (docQuery.isPending) return <ReviewSkeleton />
  if (docQuery.isError) {
    return <ReviewError title="This document could not be opened" onRetry={() => void docQuery.refetch()} />
  }
  return (
    <div className="flex flex-col gap-4">
      <ReviewHeader doc={docQuery.data} typeName={typeQuery.data?.name ?? null} />
      <ReviewBody doc={docQuery.data} typeQuery={typeQuery} />
    </div>
  )
}
