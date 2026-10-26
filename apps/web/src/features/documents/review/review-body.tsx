import type { UseQueryResult } from '@tanstack/react-query'
import type { Document, DocumentType } from '@/lib/mock/types'
import { ChooseTypePanel } from './choose-type-panel'
import { DocumentErrorPanel } from './document-error-panel'
import { ProcessingPanel } from './processing-panel'
import { ReviewFieldsView } from './review-fields-view'

interface ReviewBodyProps {
  doc: Document
  typeQuery: UseQueryResult<DocumentType>
}

/** What the screen shows for each document status. */
export const ReviewBody = ({ doc, typeQuery }: ReviewBodyProps) => {
  switch (doc.status) {
    case 'needs_review':
    case 'approved':
    case 'exported':
    case 'rejected':
      return <ReviewFieldsView doc={doc} typeQuery={typeQuery} />
    case 'unclassified':
      return <ChooseTypePanel doc={doc} />
    case 'uploaded':
    case 'processing':
      return <ProcessingPanel doc={doc} />
    case 'error':
      return <DocumentErrorPanel doc={doc} />
    default: {
      const unreachable: never = doc.status
      return unreachable
    }
  }
}
