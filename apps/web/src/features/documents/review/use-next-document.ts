import { useNavigate } from 'react-router'
import { useDocuments } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/mock/types'
import { reviewDoneState } from './review-done'

/** The oldest other document in the queue, like a queue. */
const nextInQueue = (queue: Document[], currentId: string) =>
  queue.filter((d) => d.id !== currentId).sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))[0]

/**
 * After an action: on to the oldest other `needs_review` document of the same type, or back to the Inbox.
 * The destination is planned before the action runs: once it succeeds the document refetches and the
 * actions may unmount, so nothing is awaited afterwards. `action` names what was done, for the message
 * when the queue isn't loaded. `null` is a plain skip (the N key): it leaves the document as is, so an
 * unsaved draft still asks first.
 */
export const useNextDocument = (doc: Document, type: DocumentType) => {
  const navigate = useNavigate()
  const queue = useDocuments({ typeId: doc.typeId ?? undefined, status: 'needs_review' })

  return (action: 'approved' | 'rejected' | null) => {
    const next = queue.data && nextInQueue(queue.data, doc.id)
    if (action === null) return () => void navigate(next ? `/documents/${next.id}` : '/inbox')
    if (queue.data === undefined) return () => void navigate('/inbox', { state: reviewDoneState(`Document ${action}.`) })
    return next
      ? () => void navigate(`/documents/${next.id}`, { state: reviewDoneState() })
      : () => void navigate('/inbox', { state: reviewDoneState(`All ${type.name} documents are reviewed.`) })
  }
}
