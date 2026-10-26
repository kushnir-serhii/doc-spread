import { useNavigate } from 'react-router'
import { useDocuments } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/mock/types'
import { reviewDoneState } from './review-done'

/**
 * After an action: on to the oldest other `needs_review` document of the same type, or back to the Inbox.
 * The destination is planned before the action runs: once it succeeds the document refetches and the
 * actions may unmount, so nothing is awaited afterwards. `action` names what was done, for the message
 * when the queue isn't loaded.
 */
export const useNextDocument = (doc: Document, type: DocumentType) => {
  const navigate = useNavigate()
  const queue = useDocuments({ typeId: doc.typeId ?? undefined, status: 'needs_review' })

  return (action: 'approved' | 'rejected') => {
    if (queue.data === undefined) return () => void navigate('/inbox', { state: reviewDoneState(`Document ${action}.`) })
    const next = queue.data.filter((d) => d.id !== doc.id).sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))[0]
    return next
      ? () => void navigate(`/documents/${next.id}`, { state: reviewDoneState() })
      : () => void navigate('/inbox', { state: reviewDoneState(`All ${type.name} documents are reviewed.`) })
  }
}
