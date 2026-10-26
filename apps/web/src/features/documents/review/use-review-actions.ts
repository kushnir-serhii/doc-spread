import { useState } from 'react'
import { useApproveDocuments, useRejectDocument } from '@/lib/api'
import { validateDocument } from '@/lib/fields/validate-field-value'
import type { Document, DocumentType, FieldValue } from '@/lib/mock/types'
import { useNextDocument } from './use-next-document'

interface UseReviewActionsOptions {
  doc: Document
  type: DocumentType
  draft: Record<string, FieldValue>
  dirty: boolean
  saveNow: () => Promise<void>
}

/** Approve (checks, saves, approves) and Reject, each followed by the next document in the queue. */
export const useReviewActions = ({ doc, type, draft, dirty, saveNow }: UseReviewActionsOptions) => {
  const planNext = useNextDocument(doc, type)
  const approveMutation = useApproveDocuments()
  const rejectMutation = useRejectDocument()
  // After a blocked Approve the list stays and follows the draft, so it empties as the problems are fixed.
  const [blocked, setBlocked] = useState(false)
  const issues = blocked ? validateDocument(type, draft) : []

  const approve = async () => {
    const found = validateDocument(type, draft)
    setBlocked(found.length > 0)
    if (found.length > 0) return
    const goNext = planNext('approved')
    try {
      // one action: the edits are stored first, so what is approved is what is on screen
      if (dirty) await saveNow()
      await approveMutation.mutateAsync([doc.id])
    } catch {
      // a failed save shows in the save state, a failed approval in approveMutation
      return
    }
    goNext()
  }

  const reject = async (reason: string) => {
    const goNext = planNext('rejected')
    try {
      await rejectMutation.mutateAsync({ id: doc.id, reason })
    } catch {
      return
    }
    goNext()
  }

  return {
    approve,
    reject,
    issues,
    approving: approveMutation.isPending,
    approveError: approveMutation.isError ? approveMutation.error.message : null,
    rejecting: rejectMutation.isPending,
    rejectError: rejectMutation.isError ? rejectMutation.error.message : null,
    resetRejectError: rejectMutation.reset,
  }
}
